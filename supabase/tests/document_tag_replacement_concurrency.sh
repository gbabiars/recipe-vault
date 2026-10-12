#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to the disposable local Supabase database}"
owner="document_tag_concurrency_$$"
holder_app="${owner}_holder"
alpha_app="${owner}_alpha"
beta_app="${owner}_beta"
holder_log=$(mktemp)
alpha_log=$(mktemp)
beta_log=$(mktemp)
holder_pid=""
alpha_pid=""
beta_pid=""

cleanup() {
  for process_id in "$alpha_pid" "$beta_pid" "$holder_pid"; do
    if [[ -n "$process_id" ]] && kill -0 "$process_id" 2>/dev/null; then
      kill "$process_id" 2>/dev/null || true
      wait "$process_id" 2>/dev/null || true
    fi
  done
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
    -c "delete from public.recipes where owner_id = '$owner';" >/dev/null 2>&1 || true
  rm -f "$holder_log" "$alpha_log" "$beta_log"
}
trap cleanup EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q <<SQL
insert into public.recipes (owner_id, document)
values
  ('$owner', '{"title":"Concurrency alpha","description":"","time":{},"ingredients":[{"name":"rice"}],"equipment":[],"instructions":["Cook rice."],"notes":[],"tags":["alpha"]}'),
  ('$owner', '{"title":"Concurrency beta","description":"","time":{},"ingredients":[{"name":"beans"}],"equipment":[],"instructions":["Cook beans."],"notes":[],"tags":["beta"]}');
SQL

# Hold the same owner lock used by recipe writes and bulk tag replacement so
# both concurrent requests queue behind it before they are released.
PGAPPNAME="$holder_app" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
  >"$holder_log" 2>&1 <<SQL &
begin;
select pg_advisory_xact_lock(hashtextextended('$owner', 726384::bigint));
select pg_sleep(2);
commit;
SQL
holder_pid=$!

attempts=0
while true; do
  holder_ready=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
    "select count(*) from pg_stat_activity where application_name = '$holder_app' and state = 'active' and query like '%pg_sleep(2)%';")
  [[ "$holder_ready" == "1" ]] && break
  attempts=$((attempts + 1))
  if [[ "$attempts" -ge 100 ]] || ! kill -0 "$holder_pid" 2>/dev/null; then
    printf 'Owner lock holder did not reach its pause\n' >&2
    cat "$holder_log" >&2
    exit 1
  fi
  sleep 0.05
done

PGAPPNAME="$alpha_app" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt \
  >"$alpha_log" 2>&1 <<SQL &
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"$owner","role":"authenticated"}', true);
select status from public.recipe_vault_replace_document_tag('$owner', 'alpha', 'beta');
commit;
SQL
alpha_pid=$!

PGAPPNAME="$beta_app" psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt \
  >"$beta_log" 2>&1 <<SQL &
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"$owner","role":"authenticated"}', true);
select status from public.recipe_vault_replace_document_tag('$owner', 'beta', 'gamma');
commit;
SQL
beta_pid=$!

attempts=0
while true; do
  waiting=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
    "select count(*) from pg_stat_activity where application_name in ('$alpha_app', '$beta_app') and wait_event_type = 'Lock' and lower(wait_event) = 'advisory';")
  [[ "$waiting" == "2" ]] && break
  attempts=$((attempts + 1))
  if [[ "$attempts" -ge 100 ]] || ! kill -0 "$alpha_pid" 2>/dev/null || ! kill -0 "$beta_pid" 2>/dev/null; then
    printf 'Concurrent replacements did not both queue on the owner lock (waiting=%s)\n' "$waiting" >&2
    cat "$alpha_log" "$beta_log" >&2
    exit 1
  fi
  sleep 0.05
done

wait "$alpha_pid" || { cat "$alpha_log" >&2; exit 1; }
alpha_pid=""
wait "$beta_pid" || { cat "$beta_log" >&2; exit 1; }
beta_pid=""
wait "$holder_pid" || { cat "$holder_log" >&2; exit 1; }
holder_pid=""

statuses=$(cat "$alpha_log" "$beta_log" | tr -d '[:space:]')
if [[ "$statuses" != *replaced* ]] || [[ $(grep -o replaced <<<"$statuses" | wc -l | tr -d ' ') != "2" ]]; then
  printf 'Concurrent replacements returned unexpected statuses: %s\n' "$statuses" >&2
  exit 1
fi

final_tags=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "select string_agg(document -> 'tags' ->> 0, ',' order by document ->> 'title') from public.recipes where owner_id = '$owner';")
if [[ "$final_tags" != "gamma,gamma" && "$final_tags" != "beta,gamma" ]]; then
  printf 'Concurrent replacements produced invalid final tags: %s\n' "$final_tags" >&2
  exit 1
fi

printf 'Concurrent owner-scoped replacements serialized successfully (%s).\n' "$final_tags"
