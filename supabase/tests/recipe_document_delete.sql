-- Run after applying local migrations:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recipe_document_delete.sql
-- Owner-scoped fixtures and audit events roll back at the end.

begin;
select set_config('test.recipe_document_delete_token', gen_random_uuid()::text, true);
select set_config(
  'test.recipe_document_delete_owner',
  'recipe_document_delete_' || replace(current_setting('test.recipe_document_delete_token'), '-', ''),
  true
);

insert into public.recipes (owner_id, title, description, tags, notes, instructions, ingredients, equipment, revision)
values (
  current_setting('test.recipe_document_delete_owner'),
  'No-yield delete fixture ' || current_setting('test.recipe_document_delete_token'), '', array['weeknight'],
  array[]::text[], array['Slice the onion.'], '[{"name":"onion"}]'::jsonb, '[]'::jsonb,
  4
);

set local role authenticated;

-- An authenticated role without claims cannot impersonate a document owner.
do $verify$
declare
  fixture_id uuid;
begin
  if auth.jwt() is not null then
    raise exception 'Expected authenticated SQL session to have no JWT claims';
  end if;
  select id into fixture_id from public.recipes
  where owner_id = current_setting('test.recipe_document_delete_owner');
  begin
    perform * from public.recipe_vault_delete_recipe_document(
      'forged_owner_without_jwt', fixture_id, 4, null, null
    );
    raise exception 'Delete accepted a forged owner without JWT claims';
  exception when insufficient_privilege then
    null;
  end;
end;
$verify$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', current_setting('test.recipe_document_delete_owner'),
    'role', 'authenticated'
  )::text,
  true
);

do $verify$
declare
  result record;
  fixture_id uuid;
  fixture_owner text := current_setting('test.recipe_document_delete_owner');
  request_id text := current_setting('test.recipe_document_delete_token');
begin
  select id into fixture_id from public.recipes
  where owner_id = fixture_owner
    and title = 'No-yield delete fixture ' || current_setting('test.recipe_document_delete_token');

  -- A valid caller still cannot supply a different owner identity.
  begin
    perform * from public.recipe_vault_delete_recipe_document(
      'forged_owner', fixture_id, 4, request_id, 'DELETE'
    );
    raise exception 'Delete accepted owner different from JWT subject';
  exception when insufficient_privilege then
    null;
  end;

  select * into result from public.recipe_vault_delete_recipe_document(
    fixture_owner, fixture_id, 3, request_id, 'DELETE'
  );
  if result.status <> 'conflict' or result.recipe_id <> fixture_id or result.revision <> 4 then
    raise exception 'Stale delete did not return current revision conflict: %', result;
  end if;
  if exists (select 1 from public.recipe_audit_events where event_data ->> 'requestId' = request_id) then
    raise exception 'Failed delete recorded an audit event';
  end if;

  select * into result from public.recipe_vault_delete_recipe_document(
    fixture_owner, fixture_id, 4, request_id, 'DELETE'
  );
  if result.status <> 'deleted' or result.recipe_id <> fixture_id or result.revision <> 4 then
    raise exception 'Current revision delete failed: %', result;
  end if;
  if exists (select 1 from public.recipes where id = fixture_id) then
    raise exception 'Recipe deletion did not remove the document row';
  end if;
  if (select count(*) from public.recipe_audit_events
      where event_data ->> 'requestId' = request_id
        and event_type = 'recipe.deleted'
        and event_data ->> 'recipeId' = fixture_id::text
        and recipe_id is null) <> 1 then
    raise exception 'Successful delete did not write exactly one detached audit event';
  end if;

  select * into result from public.recipe_vault_delete_recipe_document(
    fixture_owner, fixture_id, 4, request_id || '-missing', 'DELETE'
  );
  if result.status <> 'not_found' or result.recipe_id is not null then
    raise exception 'Missing recipe did not return not_found';
  end if;
  if exists (select 1 from public.recipe_audit_events
      where event_data ->> 'requestId' = request_id || '-missing') then
    raise exception 'Missing delete recorded an audit event';
  end if;
end;
$verify$;

-- A successful delete inside a savepoint can be rolled back with the row intact.
reset role;
insert into public.recipes (owner_id, title, description, tags, notes, instructions, ingredients, equipment, revision)
values (
  current_setting('test.recipe_document_delete_owner'),
  'Rollback delete fixture ' || current_setting('test.recipe_document_delete_token'), '', array[]::text[],
  array[]::text[], array['Season.'], '[{"name":"salt"}]'::jsonb, '[]'::jsonb,
  2
);
set local role authenticated;
savepoint recipe_document_delete_rollback;
do $verify$
declare
  result record;
  fixture_id uuid;
begin
  select id into fixture_id from public.recipes
  where owner_id = current_setting('test.recipe_document_delete_owner')
    and title = 'Rollback delete fixture ' || current_setting('test.recipe_document_delete_token');
  select * into result from public.recipe_vault_delete_recipe_document(
    current_setting('test.recipe_document_delete_owner'), fixture_id, 2, null, null
  );
  if result.status <> 'deleted' then
    raise exception 'Rollback fixture delete failed: %', result;
  end if;
end;
$verify$;
rollback to savepoint recipe_document_delete_rollback;
do $verify$
begin
  if not exists (
    select 1 from public.recipes
    where owner_id = current_setting('test.recipe_document_delete_owner')
      and title = 'Rollback delete fixture ' || current_setting('test.recipe_document_delete_token')
  ) then
    raise exception 'Savepoint rollback did not restore deleted recipe';
  end if;
end;
$verify$;

rollback;
