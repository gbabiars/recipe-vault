-- Run after applying all migrations to the disposable local Supabase database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/document_tag_inventory.sql
-- Inventory rows must be derived from recipe tag columns, scoped to the supplied owner,
-- and returned in stable cursor order. All fixtures are rolled back.

begin;
select set_config('test.document_tag_inventory_token', gen_random_uuid()::text, true);

insert into public.recipes (owner_id, title, description, tags, instructions, ingredients, equipment)
values
  ('document_tag_owner','Tag inventory one','',array['dinner','weeknight'],array['Cook rice.'],'[{"name":"rice"}]'::jsonb,'[]'::jsonb),
  ('document_tag_owner','Tag inventory two','',array['dinner','lunch'],array['Cook beans.'],'[{"name":"beans"}]'::jsonb,'[]'::jsonb),
  ('document_tag_other','Other owner tag inventory','',array['dinner'],array['Cook soup.'],'[{"name":"soup"}]'::jsonb,'[]'::jsonb);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"document_tag_owner","role":"authenticated"}',
  true
);

do $verify$
declare
  name_page text[];
  usage_page text[];
  exact_recipe_ids uuid[];
begin
  select pg_catalog.array_agg(name order by name)
  into name_page
  from public.recipe_vault_list_document_tag_inventory(
    'document_tag_owner', null, 'name_asc', null, null, 10
  );
  if name_page <> array['dinner', 'lunch', 'weeknight'] then
    raise exception 'inventory did not derive only the document tag names: %', name_page;
  end if;

  if (select usage_count from public.recipe_vault_list_document_tag_inventory(
      'document_tag_owner', null, 'name_asc', null, null, 10
    ) where name = 'dinner') <> 2 then
    raise exception 'inventory did not count distinct owner recipes';
  end if;

  if (select pg_catalog.array_agg(name order by name)
      from public.recipe_vault_list_document_tag_inventory(
        'document_tag_owner', 'NIGHT', 'name_asc', null, null, 10
      )) <> array['weeknight'] then
    raise exception 'inventory substring search was not case-insensitive';
  end if;

  select pg_catalog.array_agg(name order by usage_count desc, name)
  into usage_page
  from public.recipe_vault_list_document_tag_inventory(
    'document_tag_owner', null, 'usage_desc', null, null, 10
  );
  if usage_page <> array['dinner', 'lunch', 'weeknight'] then
    raise exception 'usage order was not deterministic by usage then name';
  end if;

  if (select pg_catalog.array_agg(name order by usage_count desc, name)
      from public.recipe_vault_list_document_tag_inventory(
        'document_tag_owner', null, 'usage_desc', 2, 'dinner', 10
      )) <> array['lunch', 'weeknight'] then
    raise exception 'usage cursor did not continue after (usageCount, name)';
  end if;

  if (select pg_catalog.array_agg(name order by usage_count desc, name)
      from public.recipe_vault_list_document_tag_inventory(
        'document_tag_owner', null, 'usage_desc', 1, 'lunch', 10
      )) <> array['weeknight'] then
    raise exception 'usage cursor did not advance through equal-count names';
  end if;

  if (select pg_catalog.array_agg(name order by name)
      from public.recipe_vault_list_document_tag_inventory(
        'document_tag_owner', null, 'name_asc', null, 'dinner', 10
      )) <> array['lunch', 'weeknight'] then
    raise exception 'name cursor did not continue deterministically';
  end if;

  if (select pg_catalog.array_agg(name order by name)
      from public.recipe_vault_list_document_tag_inventory(
        'document_tag_owner', null, 'name_asc', null, null, null, 'lunch', 10
      )) <> array['dinner'] then
    raise exception 'reverse name cursor did not return earlier tags';
  end if;

  select pg_catalog.array_agg(recipe_id order by recipe_id)
  into exact_recipe_ids
  from public.recipe_vault_list_recipe_ids_by_document_tag('document_tag_owner', 'dinner');
  if cardinality(exact_recipe_ids) <> 2 then
    raise exception 'exact JSON array containment returned the wrong recipe IDs';
  end if;

  begin
    perform * from public.recipe_vault_list_document_tag_inventory(
      'document_tag_owner', null, null, null, null, 10
    );
    raise exception 'NULL sort order was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform * from public.recipe_vault_list_document_tag_inventory(
      'document_tag_owner', null, 'name_asc', null, null, null
    );
    raise exception 'NULL page size was accepted';
  exception when sqlstate '22023' then
    null;
  end;

  if exists (
    select 1 from public.recipe_vault_list_document_tag_inventory(
      'document_tag_other', null, 'name_asc', null, null, 10
    )
  ) then
    raise exception 'authenticated owner read returned another owner''s tags';
  end if;

  if exists (
    select 1 from public.recipe_vault_list_recipe_ids_by_document_tag(
      'document_tag_other', 'dinner'
    )
  ) then
    raise exception 'authenticated exact tag filter returned another owner''s recipes';
  end if;
end;
$verify$;

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $verify$
begin
  if (select usage_count from public.recipe_vault_list_document_tag_inventory(
      'document_tag_owner', null, 'name_asc', null, null, 10
    ) where name = 'dinner') <> 2
    or exists (
      select 1 from public.recipe_vault_list_recipe_ids_by_document_tag(
        'document_tag_owner', 'dinner'
      ) where recipe_id in (
        select id from public.recipes where owner_id = 'document_tag_other'
      )
    ) then
    raise exception 'service-role inventory did not honor its explicitly bound owner argument';
  end if;
end;
$verify$;

reset role;
set local role anon;
do $verify$
begin
  begin
    perform * from public.recipe_vault_list_document_tag_inventory(
      'document_tag_owner', null, 'name_asc', null, null, 10
    );
    raise exception 'anon could execute the document tag inventory RPC';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

rollback;
