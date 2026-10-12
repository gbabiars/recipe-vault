-- Run after applying local migrations:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recipe_document_writer.sql
-- All fixtures and tag replacements roll back at the end of this test.

begin;
select set_config('test.recipe_document_writer_token', gen_random_uuid()::text, true);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_document_writer_owner","role":"authenticated"}',
  true
);

do $verify$
declare
  result record;
  fixture_token text := current_setting('test.recipe_document_writer_token');
  target_fixture_recipe_id uuid;
  created_document jsonb := jsonb_build_object(
    'title', 'Pickled onions ' || current_setting('test.recipe_document_writer_token'),
    'description', '',
    'time', jsonb_build_object('prepMinutes', 10),
    'ingredients', jsonb_build_array(jsonb_build_object('name', 'red onion')),
    'equipment', '[]'::jsonb,
    'instructions', jsonb_build_array('Slice the onion.'),
    'notes', '[]'::jsonb,
    'tags', jsonb_build_array('weeknight')
  );
  replaced_document jsonb;
  invalid_document jsonb;
begin
  select * into result
  from public.recipe_vault_write_recipe_document(
    'recipe_document_writer_owner', null, null, created_document
  );
  if result.status <> 'saved' or result.recipe_id is null or result.revision <> 1
    or result.document <> created_document then
    raise exception 'Authenticated create did not return the saved document and initial revision: %', result;
  end if;
  target_fixture_recipe_id := result.recipe_id;
  replaced_document := created_document || jsonb_build_object(
    'title', 'Pickled onions with yield ' || fixture_token,
    'yield', jsonb_build_object('amount', 1, 'unit', 'jar')
  );
  select * into result
  from public.recipe_vault_write_recipe_document(
    'recipe_document_writer_owner', target_fixture_recipe_id, 1, replaced_document
  );
  if result.status <> 'saved' or result.revision <> 2 or result.document <> replaced_document then
    raise exception 'Authenticated replacement did not save non-serving yield: %', result;
  end if;

  select * into result
  from public.recipe_vault_write_recipe_document(
    'recipe_document_writer_owner', gen_random_uuid(), 1, replaced_document
  );
  if result.status <> 'not_found' or result.recipe_id is not null then
    raise exception 'Missing owner recipe did not return not_found: %', result;
  end if;

  select * into result
  from public.recipe_vault_write_recipe_document(
    'recipe_document_writer_owner', target_fixture_recipe_id, null, replaced_document
  );
  if result.status <> 'invalid' then
    raise exception 'Mismatched ID/revision arguments did not return invalid: %', result;
  end if;

  -- The complete database schema constraint, rather than application-only
  -- validation, rejects malformed nested documents without changing the row.
  invalid_document := replaced_document || jsonb_build_object(
    'yield', jsonb_build_object('amount', 0, 'unit', 'jar')
  );
  select * into result
  from public.recipe_vault_write_recipe_document(
    'recipe_document_writer_owner', target_fixture_recipe_id, 2, invalid_document
  );
  if result.status <> 'invalid' then
    raise exception 'Invalid nested yield did not return invalid: %', result;
  end if;
  if (select revision from public.recipes where id = target_fixture_recipe_id) <> 2
    or (select document from public.recipes where id = target_fixture_recipe_id) <> replaced_document then
    raise exception 'Invalid replacement changed persisted recipe content';
  end if;

  -- A tag-name replacement increments every changed recipe revision while
  -- holding the shared owner lock. The stale edit must not restore the name.
  select * into result
  from public.recipe_vault_replace_document_tag(
    'recipe_document_writer_owner', 'weeknight', 'dinner'
  );
  if result.status <> 'replaced' or result.changed_recipes <> 1 then
    raise exception 'Document tag replacement did not affect the fixture: %', result;
  end if;
  select * into result
  from public.recipe_vault_write_recipe_document(
    'recipe_document_writer_owner', target_fixture_recipe_id, 2, replaced_document
  );
  if result.status <> 'conflict' or result.recipe_id <> target_fixture_recipe_id or result.revision <> 3 then
    raise exception 'Stale replacement did not return current revision conflict: %', result;
  end if;
  if (select document -> 'tags' from public.recipes where id = target_fixture_recipe_id)
    <> jsonb_build_array('dinner') then
    raise exception 'Stale recipe write restored the replaced tag name';
  end if;

  -- This raises before inspecting a target row; owner_id is bound to the JWT,
  -- not accepted as independent proof from the RPC argument.
  perform set_config(
    'request.jwt.claims',
    '{"sub":"recipe_document_writer_other","role":"authenticated"}',
    true
  );
  begin
    perform * from public.recipe_vault_write_recipe_document(
      'recipe_document_writer_owner', target_fixture_recipe_id, 3, replaced_document
    );
    raise exception 'Wrong-owner RPC call was accepted';
  exception when insufficient_privilege then
    null;
  end;
  perform set_config(
    'request.jwt.claims',
    '{"sub":"recipe_document_writer_owner","role":"authenticated"}',
    true
  );

  if (select revision from public.recipes where id = target_fixture_recipe_id) <> 3 then
    raise exception 'Wrong-owner RPC call changed recipe revision';
  end if;
end;
$verify$;

-- Exercise statement rollback independently of the surrounding test rollback.
savepoint recipe_document_writer_rollback;
select status
from public.recipe_vault_write_recipe_document(
  'recipe_document_writer_owner', null, null,
  jsonb_build_object(
    'title', 'Rollback fixture ' || current_setting('test.recipe_document_writer_token'),
    'description', '', 'time', '{}'::jsonb,
    'ingredients', jsonb_build_array(jsonb_build_object('name', 'salt')),
    'equipment', '[]'::jsonb, 'instructions', jsonb_build_array('Season.'),
    'notes', '[]'::jsonb, 'tags', '[]'::jsonb
  )
);
rollback to savepoint recipe_document_writer_rollback;
do $verify$
begin
  if exists (
    select 1 from public.recipes
    where document ->> 'title' = 'Rollback fixture ' || current_setting('test.recipe_document_writer_token')
  ) then
    raise exception 'Rollback did not remove created recipe';
  end if;
end;
$verify$;

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $verify$
declare
  result record;
  content jsonb := jsonb_build_object(
    'title', 'Service-role explicit owner fixture ' || current_setting('test.recipe_document_writer_token'),
    'description', '', 'time', '{}'::jsonb,
    'ingredients', jsonb_build_array(jsonb_build_object('name', 'beans')),
    'equipment', '[]'::jsonb, 'instructions', jsonb_build_array('Cook the beans.'),
    'notes', '[]'::jsonb, 'tags', '[]'::jsonb
  );
begin
  select * into result
  from public.recipe_vault_write_recipe_document(
    'recipe_document_writer_service_bound_owner', null, null, content
  );
  if result.status <> 'saved' or result.revision <> 1
    or not exists (
      select 1 from public.recipes
      where id = result.recipe_id
        and owner_id = 'recipe_document_writer_service_bound_owner'
        and document = content
    ) then
    raise exception 'Explicit service-role owner binding failed: %', result;
  end if;
end;
$verify$;

rollback;
