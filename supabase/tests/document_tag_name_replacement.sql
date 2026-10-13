-- Run after applying all migrations to the disposable local Supabase database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/document_tag_name_replacement.sql
-- Exercises owner authorization, canonical names, rename/merge, revisions,
-- missing sources, stable overlapping operations, and statement rollback.

begin;
select set_config('test.document_tag_replace_token', gen_random_uuid()::text, true);

insert into public.recipes (owner_id,title,description,tags,notes,instructions,ingredients,equipment,revision)
select owner,title,'',tags,array[]::text[],array['Cook.'],'[{"name":"fixture"}]'::jsonb,'[]'::jsonb,revision
from (values
  ('document_tag_replace_owner','Replace duplicate target',array['weeknight','quick meals']::text[],1),
  ('document_tag_replace_owner','Replace source position',array['quick meals','rice']::text[],7),
  ('document_tag_replace_owner','Unaffected recipe',array['pantry']::text[],4),
  ('document_tag_replace_other','Other owner recipe',array['quick meals']::text[],3),
  ('document_tag_replace_owner','Order case one',array['alpha']::text[],1),
  ('document_tag_replace_owner','Order case two',array['beta']::text[],1),
  ('document_tag_replace_owner','Rollback case one',array['rollback']::text[],1),
  ('document_tag_replace_owner','Rollback case two',array['rollback']::text[],2147483647)
) as fixtures(owner,title,tags,revision);

set local role authenticated;
-- An authenticated database role without JWT claims must not inherit the
-- SECURITY DEFINER service-role bypass when the JWT role claim is NULL.
do $verify$
begin
  if auth.jwt() is not null then
    raise exception 'Expected authenticated SQL session to have no JWT claims';
  end if;

  begin
    perform public.recipe_vault_lock_document_owner('forged_owner_without_jwt');
    raise exception 'owner lock accepted a forged owner without JWT claims';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform * from public.recipe_vault_replace_document_tag(
      'forged_owner_without_jwt', 'weeknight', 'dinner'
    );
    raise exception 'tag replacement accepted a forged owner without JWT claims';
  exception when insufficient_privilege then
    null;
  end;
end;
$verify$;

select set_config(
  'request.jwt.claims',
  '{"sub":"document_tag_replace_owner","role":"authenticated"}',
  true
);

do $verify$
declare
  result_status text;
  changed_count integer;
  candidate text[];
  target_recipe_id uuid;
  unaffected_revision integer;
  fixture_count integer;
  current_title text;
  current_revision integer;
begin
  -- Wrong-owner calls are authorization failures, not an empty/missing result.
  begin
    perform * from public.recipe_vault_replace_document_tag(
      'document_tag_replace_other', 'quick meals', 'weeknight'
    );
    raise exception 'wrong-owner replacement was allowed';
  exception when insufficient_privilege then
    null;
  end;

  select result.status, result.changed_recipes into result_status, changed_count
  from public.recipe_vault_replace_document_tag(
    'document_tag_replace_owner', 'quick meals', 'weeknight'
  ) as result;
  if result_status is distinct from 'replaced' or changed_count is distinct from 2 then
    raise exception 'rename did not update exactly the source-tag recipes';
  end if;

  if (select tags from public.recipes
      where owner_id = 'document_tag_replace_owner' and title = 'Replace duplicate target')
    is distinct from array['weeknight']::text[] then
    raise exception 'merge did not collapse the duplicate target name';
  end if;
  if (select tags from public.recipes
      where owner_id = 'document_tag_replace_owner' and title = 'Replace source position')
    is distinct from array['weeknight','rice']::text[] then
    raise exception 'rename did not preserve tag ordering';
  end if;
  if (select revision from public.recipes
      where owner_id = 'document_tag_replace_owner' and title = 'Replace duplicate target') is distinct from 2
    or (select revision from public.recipes
      where owner_id = 'document_tag_replace_owner' and title = 'Replace source position') is distinct from 8 then
    raise exception 'changed recipe revisions were not bumped exactly once';
  end if;

  select revision into unaffected_revision from public.recipes
  where owner_id = 'document_tag_replace_owner' and title = 'Unaffected recipe';
  if unaffected_revision is distinct from 4 then raise exception 'unaffected recipe revision changed'; end if;

  select result.status, result.changed_recipes into result_status, changed_count
  from public.recipe_vault_replace_document_tag(
    'document_tag_replace_owner', 'quick meals', 'supper'
  ) as result;
  if result_status is distinct from 'source_missing' or changed_count is distinct from 0 then
    raise exception 'missing source did not return the stable source_missing result';
  end if;

  -- Sequentially exercise overlapping source/target names in each order. The
  -- owner transaction lock makes concurrent calls equivalent to one of these.
  perform * from public.recipe_vault_replace_document_tag(
    'document_tag_replace_owner', 'alpha', 'beta'
  );
  perform * from public.recipe_vault_replace_document_tag(
    'document_tag_replace_owner', 'beta', 'gamma'
  );
  select pg_catalog.count(*) into fixture_count from public.recipes
  where owner_id = 'document_tag_replace_owner'
    and title in ('Order case one', 'Order case two');
  if fixture_count is distinct from 2 then
    raise exception 'alpha-then-beta order did not retain both test recipes';
  end if;
  if exists (select 1 from public.recipes
      where owner_id = 'document_tag_replace_owner'
        and title in ('Order case one', 'Order case two')
        and tags is distinct from array['gamma']::text[]) then
    raise exception 'overlapping replacements in alpha-then-beta order were inconsistent';
  end if;

  select id, title, revision into target_recipe_id, current_title, current_revision
  from public.recipes
  where owner_id = 'document_tag_replace_owner' and title = 'Order case one';
  select status into result_status
  from public.recipe_vault_write_recipe_document(
    'document_tag_replace_owner', target_recipe_id, current_revision,
    jsonb_build_object('title',current_title,'description','','time','{}'::jsonb,'ingredients','[{"name":"fixture"}]'::jsonb,'equipment','[]'::jsonb,'instructions','["Cook."]'::jsonb,'notes','[]'::jsonb,'tags','["alpha"]'::jsonb)
  );
  if result_status is distinct from 'saved' then
    raise exception 'could not reset first recipe through document writer';
  end if;
  select id, title, revision into target_recipe_id, current_title, current_revision
  from public.recipes
  where owner_id = 'document_tag_replace_owner' and title = 'Order case two';
  select status into result_status
  from public.recipe_vault_write_recipe_document(
    'document_tag_replace_owner', target_recipe_id, current_revision,
    jsonb_build_object('title',current_title,'description','','time','{}'::jsonb,'ingredients','[{"name":"fixture"}]'::jsonb,'equipment','[]'::jsonb,'instructions','["Cook."]'::jsonb,'notes','[]'::jsonb,'tags','["beta"]'::jsonb)
  );
  if result_status is distinct from 'saved' then
    raise exception 'could not reset second recipe through document writer';
  end if;
  perform * from public.recipe_vault_replace_document_tag(
    'document_tag_replace_owner', 'beta', 'gamma'
  );
  perform * from public.recipe_vault_replace_document_tag(
    'document_tag_replace_owner', 'alpha', 'beta'
  );
  select pg_catalog.count(*) into fixture_count from public.recipes
  where owner_id = 'document_tag_replace_owner'
    and title in ('Order case one', 'Order case two');
  if fixture_count is distinct from 2 then
    raise exception 'beta-then-alpha order did not retain both test recipes';
  end if;
  if (select tags from public.recipes
      where owner_id = 'document_tag_replace_owner' and title = 'Order case one') is distinct from array['beta']::text[]
    or (select tags from public.recipes
      where owner_id = 'document_tag_replace_owner' and title = 'Order case two') is distinct from array['gamma']::text[] then
    raise exception 'overlapping replacements in beta-then-alpha order were inconsistent';
  end if;

  -- A revision overflow after another affected row would abort the complete
  -- update statement. Verify that no document was partly changed.
  select id into target_recipe_id from public.recipes
  where owner_id = 'document_tag_replace_owner' and title = 'Rollback case two';
  if target_recipe_id is null then
    raise exception 'rollback fixture did not create its maximum-revision row';
  end if;

  begin
    perform * from public.recipe_vault_replace_document_tag(
      'document_tag_replace_owner', 'rollback', 'recovered'
    );
    raise exception 'revision overflow did not abort replacement';
  exception when numeric_value_out_of_range then
    null;
  end;

  if exists (select 1 from public.recipes
      where owner_id = 'document_tag_replace_owner'
        and title in ('Rollback case one', 'Rollback case two')
        and tags is distinct from array['rollback']::text[])
    or (select revision from public.recipes where id = target_recipe_id) is distinct from 2147483647 then
    raise exception 'failed replacement left a partial document or revision change';
  end if;
  select pg_catalog.count(*) into fixture_count from public.recipes
  where owner_id = 'document_tag_replace_owner'
    and title in ('Rollback case one', 'Rollback case two');
  if fixture_count is distinct from 2 then
    raise exception 'rollback check did not find both expected recipes';
  end if;

  -- Canonical names are required at the database boundary as well.
  foreach candidate slice 1 in array array[
    array['Weeknight', 'supper'],
    array['quick  meals', 'supper'],
    array[' quick meals', 'supper'],
    array['quick meals', 'supper '],
    array['quick!', 'supper'],
    array[repeat('a', 65), 'supper'],
    array['pantry', 'pantry']
  ] loop
    begin
      perform * from public.recipe_vault_replace_document_tag(
        'document_tag_replace_owner', candidate[1], candidate[2]
      );
      raise exception 'noncanonical or identical tag replacement was accepted: %', candidate;
    exception when sqlstate '22023' then
      null;
    end;
  end loop;
end;
$verify$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"document_tag_replace_other","role":"authenticated"}',
  true
);
do $verify$
begin
  begin
    perform public.recipe_vault_lock_document_owner('document_tag_replace_owner');
    raise exception 'wrong-owner call acquired another owner lock';
  exception when insufficient_privilege then
    null;
  end;
end;
$verify$;

rollback;
