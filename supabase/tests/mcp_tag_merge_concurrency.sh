#!/usr/bin/env bash
set -euo pipefail

owner="tag_merge_concurrency_$$"
association_log=$(mktemp)
cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
    -c "delete from public.recipes where owner_id = '$owner'; delete from public.tags where owner_id = '$owner';" >/dev/null 2>&1 || true
  rm -f "$association_log"
}
trap cleanup EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c \
  "insert into public.tags(owner_id, name) values ('$owner', 'source'), ('$owner', 'target');"
source_id=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "select id from public.tags where owner_id = '$owner' and name = 'source';")
target_id=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "select id from public.tags where owner_id = '$owner' and name = 'target';")
recipe_id=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "insert into public.recipes(owner_id, title, tags) values ('$owner', 'concurrent merge recipe', '{}') returning id;")

# Hold a source association transaction open after its FK check has locked the
# source tag. Merge must wait, then include and retarget the committed link.
association_app="${owner}_association"
PGAPPNAME="$association_app" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt >"$association_log" 2>&1 <<SQL &
begin;
update public.recipes set tags = array['source'] where id = '$recipe_id' and owner_id = '$owner';
select pg_sleep(2);
commit;
SQL
association_pid=$!
attempts=0
while true; do
  active_session=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
    "select count(*) from pg_stat_activity where application_name = '$association_app' and state = 'active' and query like '%pg_sleep(2)%';")
  [[ "$active_session" == "1" ]] && break
  attempts=$((attempts + 1))
  if [[ "$attempts" -ge 100 ]] || ! kill -0 "$association_pid" 2>/dev/null; then
    printf 'Association transaction did not reach its lock-holding pause\n' >&2
    cat "$association_log" >&2
    exit 1
  fi
  sleep 0.05
done

merge_result=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "select public.recipe_vault_merge_tags('$owner', '$source_id', '$target_id');")
wait "$association_pid" || { cat "$association_log"; exit 1; }
if [[ "$merge_result" != "t" ]]; then
  printf 'Concurrent merge returned %s; expected true\n' "$merge_result" >&2
  exit 1
fi

counts=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c "
  select (select count(*) from public.tags where owner_id = '$owner' and id = '$source_id'),
         (select count(*) from public.tags where owner_id = '$owner' and id = '$target_id'),
         (select count(*) from public.recipe_tags where owner_id = '$owner' and recipe_id = '$recipe_id' and tag_id = '$target_id'),
         (select array_to_string(tags, ',') from public.recipes where owner_id = '$owner' and id = '$recipe_id');
")
if [[ "$counts" != "0|1|1|target" ]]; then
  printf 'Concurrent merge produced %s; expected 0|1|1|target\n' "$counts" >&2
  exit 1
fi
