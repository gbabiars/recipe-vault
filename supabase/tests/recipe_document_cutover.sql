-- Run after applying local migrations:
--   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -v ON_ERROR_STOP=1 -f supabase/tests/recipe_document_cutover.sql
-- Exercises the cutover state and its owner-bound RPCs; all rows roll back.

begin;
select set_config('test.recipe_document_cutover_token', gen_random_uuid()::text, true);

do $precondition$
begin
  if exists (select 1 from public.recipes where document is null) then
    raise exception 'cutover test requires all recipes to have documents';
  end if;
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'recipes'
      and column_name = 'document'
      and is_nullable = 'NO'
  ) then
    raise exception 'recipe document cutover did not enforce NOT NULL';
  end if;
end;
$precondition$;

do $permissions$
declare
  table_name text;
begin
  foreach table_name in array array[
    'recipes', 'recipe_ingredients', 'recipe_steps', 'tags', 'recipe_tags'
  ] loop
    if not has_table_privilege('authenticated', 'public.' || table_name, 'SELECT') then
      raise exception 'authenticated SELECT was removed from public.%', table_name;
    end if;
    if has_table_privilege('authenticated', 'public.' || table_name, 'INSERT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')
      or has_table_privilege('authenticated', 'public.' || table_name, 'DELETE') then
      raise exception 'authenticated direct DML remains on public.%', table_name;
    end if;
    if has_table_privilege('service_role', 'public.' || table_name, 'INSERT')
      or has_table_privilege('service_role', 'public.' || table_name, 'UPDATE')
      or has_table_privilege('service_role', 'public.' || table_name, 'DELETE') then
      raise exception 'service-role direct DML remains on legacy public.%', table_name;
    end if;
  end loop;

  if has_function_privilege(
      'authenticated', 'public.recipe_vault_write_recipe(text,uuid,jsonb,jsonb,jsonb)', 'EXECUTE'
    ) or has_function_privilege(
      'service_role', 'public.recipe_vault_write_recipe(text,uuid,jsonb,jsonb,jsonb)', 'EXECUTE'
    ) then
    raise exception 'legacy recipe write RPC remains executable';
  end if;
  if has_function_privilege(
      'authenticated', 'public.recipe_vault_merge_tags(text,uuid,uuid)', 'EXECUTE'
    ) or has_function_privilege(
      'service_role', 'public.recipe_vault_merge_tags(text,uuid,uuid)', 'EXECUTE'
    ) then
    raise exception 'legacy merge-tag RPC remains executable';
  end if;
  if has_function_privilege(
      'authenticated', 'public.recipe_vault_delete_unused_tag(text,uuid)', 'EXECUTE'
    ) or has_function_privilege(
      'service_role', 'public.recipe_vault_delete_unused_tag(text,uuid)', 'EXECUTE'
    ) then
    raise exception 'legacy unused-tag RPC remains executable';
  end if;

  if not has_function_privilege(
      'authenticated', 'public.recipe_vault_write_recipe_document(text,uuid,integer,jsonb)', 'EXECUTE'
    ) or not has_function_privilege(
      'service_role', 'public.recipe_vault_write_recipe_document(text,uuid,integer,jsonb)', 'EXECUTE'
    ) or not has_function_privilege(
      'authenticated', 'public.recipe_vault_delete_recipe_document(text,uuid,integer,text,text)', 'EXECUTE'
    ) or not has_function_privilege(
      'service_role', 'public.recipe_vault_delete_recipe_document(text,uuid,integer,text,text)', 'EXECUTE'
    ) or not has_function_privilege(
      'authenticated', 'public.recipe_vault_replace_document_tag(text,text,text)', 'EXECUTE'
    ) or not has_function_privilege(
      'service_role', 'public.recipe_vault_replace_document_tag(text,text,text)', 'EXECUTE'
    ) then
    raise exception 'one or more document mutation RPC grants are missing';
  end if;
end;
$permissions$;

set local role authenticated;

-- Missing JWT claims must not let a caller pick an owner ID.
do $no_jwt$
declare
  fixture_document jsonb := jsonb_build_object(
    'title', 'No JWT cutover fixture', 'description', '', 'time', '{}'::jsonb,
    'ingredients', jsonb_build_array(jsonb_build_object('name', 'salt')),
    'equipment', '[]'::jsonb, 'instructions', jsonb_build_array('Season.'),
    'notes', '[]'::jsonb, 'tags', '[]'::jsonb
  );
begin
  if auth.jwt() is not null then
    raise exception 'expected test role to begin without JWT claims';
  end if;
  begin
    perform * from public.recipe_vault_write_recipe_document(
      'forged_cutover_owner', null, null, fixture_document
    );
    raise exception 'document write accepted a forged owner without JWT';
  exception when insufficient_privilege then
    null;
  end;
end;
$no_jwt$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', 'recipe_document_cutover_owner', 'role', 'authenticated'
  )::text,
  true
);

do $authenticated$
declare
  result record;
  fixture_id uuid;
  token text := current_setting('test.recipe_document_cutover_token');
  fixture_document jsonb := jsonb_build_object(
    'title', 'Cutover fixture ' || current_setting('test.recipe_document_cutover_token'),
    'description', '', 'time', '{}'::jsonb,
    'ingredients', jsonb_build_array(jsonb_build_object('name', 'salt')),
    'equipment', '[]'::jsonb, 'instructions', jsonb_build_array('Season.'),
    'notes', '[]'::jsonb, 'tags', jsonb_build_array('cutover-test')
  );
begin
  select * into result from public.recipe_vault_write_recipe_document(
    'recipe_document_cutover_owner', null, null, fixture_document
  );
  if result.status <> 'saved' or result.revision <> 1 then
    raise exception 'owner-bound document write failed after cutover: %', result;
  end if;
  fixture_id := result.recipe_id;

  if not exists (
    select 1 from public.recipes
    where id = fixture_id and owner_id = 'recipe_document_cutover_owner'
      and document = fixture_document
  ) then
    raise exception 'authenticated owner cannot read newly written recipe through RLS';
  end if;

  begin
    update public.recipes set revision = revision + 1 where id = fixture_id;
    raise exception 'authenticated direct UPDATE bypassed revision RPC';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.recipes (owner_id, title)
    values ('recipe_document_cutover_owner', 'direct insert ' || token);
    raise exception 'authenticated direct recipe INSERT remains enabled';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.recipe_ingredients (recipe_id, display_order, amount, ingredient_name)
    values (fixture_id, 1, '1', 'salt');
    raise exception 'authenticated direct legacy ingredient INSERT remains enabled';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.recipe_steps set instruction = 'changed' where recipe_id = fixture_id;
    raise exception 'authenticated direct legacy step UPDATE remains enabled';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.tags (owner_id, name)
    values ('recipe_document_cutover_owner', 'legacy');
    raise exception 'authenticated direct legacy tag INSERT remains enabled';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.recipe_vault_write_recipe(
      'recipe_document_cutover_owner', fixture_id,
      jsonb_build_object('title', 'legacy'), '[]'::jsonb, '[]'::jsonb
    );
    raise exception 'legacy recipe write RPC remains callable';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.recipe_vault_replace_document_tag(
      'another_cutover_owner', 'cutover-test', 'forged'
    );
    raise exception 'document tag RPC accepted a different owner';
  exception when insufficient_privilege then
    null;
  end;

  select * into result from public.recipe_vault_replace_document_tag(
    'recipe_document_cutover_owner', 'cutover-test', 'cutover-renamed'
  );
  if result.status <> 'replaced' or result.changed_recipes <> 1 then
    raise exception 'document tag replacement failed after cutover: %', result;
  end if;

  select * into result from public.recipe_vault_write_recipe_document(
    'recipe_document_cutover_owner', fixture_id, 1, fixture_document
  );
  if result.status <> 'conflict' or result.revision <> 2 then
    raise exception 'revision check did not detect document-tag mutation: %', result;
  end if;

  select * into result from public.recipe_vault_delete_recipe_document(
    'recipe_document_cutover_owner', fixture_id, 2, null, null
  );
  if result.status <> 'deleted' then
    raise exception 'owner-bound document delete failed after cutover: %', result;
  end if;
end;
$authenticated$;

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $service_role$
declare
  result record;
  fixture_document jsonb := jsonb_build_object(
    'title', 'Service cutover fixture', 'description', '', 'time', '{}'::jsonb,
    'ingredients', jsonb_build_array(jsonb_build_object('name', 'beans')),
    'equipment', '[]'::jsonb, 'instructions', jsonb_build_array('Cook beans.'),
    'notes', '[]'::jsonb, 'tags', '[]'::jsonb
  );
begin
  begin
    update public.recipes set revision = revision + 1
    where owner_id = 'recipe_document_cutover_service_owner';
    raise exception 'service role retained direct legacy table DML';
  exception when insufficient_privilege then
    null;
  end;

  select * into result from public.recipe_vault_write_recipe_document(
    'recipe_document_cutover_service_owner', null, null, fixture_document
  );
  if result.status <> 'saved' or result.revision <> 1 or result.recipe_id is null then
    raise exception 'service-role explicit owner-bound document write failed: %', result;
  end if;
end;
$service_role$;

rollback;
