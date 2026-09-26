#!/usr/bin/env bash
set -euo pipefail

owner="tag_concurrency_$$"
first_log=$(mktemp)
second_log=$(mktemp)
cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
    -c "delete from public.recipes where owner_id = '$owner'; delete from public.tags where owner_id = '$owner';" >/dev/null 2>&1 || true
  rm -f "$first_log" "$second_log"
}
trap cleanup EXIT

# Both sessions resolve the same canonical owner/name while one is uncommitted.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
  -c "begin; insert into public.recipes(owner_id, title, tags) values ('$owner', 'first', array['Same  Tag']); select pg_sleep(1); commit;" >"$first_log" 2>&1 &
first_pid=$!
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
  -c "insert into public.recipes(owner_id, title, tags) values ('$owner', 'second', array['same tag']);" >"$second_log" 2>&1 &
second_pid=$!
wait "$first_pid" || { cat "$first_log"; exit 1; }
wait "$second_pid" || { cat "$second_log"; exit 1; }

counts=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -c "
  select (select count(*) from public.recipes where owner_id = '$owner'),
         (select count(*) from public.tags where owner_id = '$owner' and name = 'same tag'),
         (select count(*) from public.recipe_tags where owner_id = '$owner');
")
if [[ "$counts" != "2|1|2" ]]; then
  printf 'Concurrent tag creation produced counts %s; expected 2|1|2\n' "$counts" >&2
  exit 1
fi
