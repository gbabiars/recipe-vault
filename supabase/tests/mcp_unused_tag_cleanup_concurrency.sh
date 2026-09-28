#!/usr/bin/env bash
set -euo pipefail

owner="tag_delete_concurrency_$$"
association_log=$(mktemp)
cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
    -c "delete from public.recipes where owner_id = '$owner'; delete from public.tags where owner_id = '$owner';" >/dev/null 2>&1 || true
  rm -f "$association_log"
}
trap cleanup EXIT

tag_id=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "insert into public.tags(owner_id, name) values ('$owner', 'race_tag') returning id;")
recipe_id=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "insert into public.recipes(owner_id, title, tags) values ('$owner', 'concurrent recipe', '{}') returning id;")

# Hold the association's foreign-key KEY SHARE lock while cleanup attempts its
# FOR UPDATE lock. Cleanup must wait, then observe the committed association.
association_app="${owner}_association"
PGAPPNAME="$association_app" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt >"$association_log" 2>&1 <<SQL &
begin;
update public.recipes set tags = array['race_tag'] where id = '$recipe_id' and owner_id = '$owner';
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
delete_result=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -c \
  "select public.recipe_vault_delete_unused_tag('$owner', '$tag_id');")
wait "$association_pid" || { cat "$association_log"; exit 1; }

if [[ "$delete_result" != "f" ]]; then
  printf 'Concurrent association was not preserved; delete RPC returned %s\n' "$delete_result" >&2
  exit 1
fi

counts=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -c "
  select (select count(*) from public.tags where owner_id = '$owner' and id = '$tag_id'),
         (select count(*) from public.recipe_tags where owner_id = '$owner' and tag_id = '$tag_id'),
         (select tags[1] from public.recipes where owner_id = '$owner' and id = '$recipe_id');
")
if [[ "$counts" != "1|1|race_tag" ]]; then
  printf 'Concurrent tag cleanup produced %s; expected 1|1|race_tag\n' "$counts" >&2
  exit 1
fi
