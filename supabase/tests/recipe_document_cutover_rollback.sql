-- Validate the documented pre-write rollback after the cutover gate is active.
-- This exercises the compensating grants inside a transaction and rolls them
-- back so the local database remains in the cutover state.

begin;

do $assert_cutover$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes'
      and column_name = 'document' and is_nullable = 'NO'
  ) then
    raise exception 'rollback test requires the recipe document cutover';
  end if;
  if has_table_privilege('authenticated', 'public.recipes', 'UPDATE') then
    raise exception 'rollback test requires legacy writes to be revoked';
  end if;
end;
$assert_cutover$;

-- Compensating SQL for a rollback before the document writers are reopened.
alter table public.recipes alter column document drop not null;
grant insert, update, delete on public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.tags
to authenticated, service_role;
grant insert, update, delete on public.recipe_tags to service_role;
grant execute on function public.recipe_vault_write_recipe(text, uuid, jsonb, jsonb, jsonb)
  to authenticated, service_role;
grant execute on function public.recipe_vault_merge_tags(text, uuid, uuid)
  to authenticated, service_role;
grant execute on function public.recipe_vault_delete_unused_tag(text, uuid)
  to authenticated, service_role;
revoke all on function public.recipe_vault_write_recipe_document(text, uuid, integer, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.recipe_vault_delete_recipe_document(text, uuid, integer, text, text)
  from public, anon, authenticated, service_role;
revoke all on function public.recipe_vault_replace_document_tag(text, text, text)
  from public, anon, authenticated, service_role;

do $assert_rollback$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'recipes'
      and column_name = 'document' and is_nullable <> 'YES'
  ) then
    raise exception 'pre-write rollback did not restore nullable documents';
  end if;
  if not has_table_privilege('authenticated', 'public.recipes', 'INSERT')
    or not has_table_privilege('authenticated', 'public.recipes', 'UPDATE')
    or not has_table_privilege('authenticated', 'public.recipe_ingredients', 'INSERT')
    or not has_table_privilege('authenticated', 'public.recipe_steps', 'DELETE')
    or not has_table_privilege('authenticated', 'public.tags', 'INSERT')
    or has_table_privilege('authenticated', 'public.recipe_tags', 'INSERT') then
    raise exception 'pre-write rollback did not restore legacy authenticated privileges';
  end if;
  if not has_table_privilege('service_role', 'public.recipes', 'UPDATE')
    or not has_table_privilege('service_role', 'public.recipe_tags', 'DELETE') then
    raise exception 'pre-write rollback did not restore legacy service-role privileges';
  end if;
  if not has_function_privilege(
      'authenticated', 'public.recipe_vault_write_recipe(text,uuid,jsonb,jsonb,jsonb)', 'EXECUTE'
    ) or not has_function_privilege(
      'service_role', 'public.recipe_vault_merge_tags(text,uuid,uuid)', 'EXECUTE'
    ) or has_function_privilege(
      'authenticated', 'public.recipe_vault_write_recipe_document(text,uuid,integer,jsonb)', 'EXECUTE'
    ) then
    raise exception 'pre-write rollback did not restore the legacy RPC boundary';
  end if;
end;
$assert_rollback$;

-- Check a restored legacy create through the same JWT-bound RPC old app code
-- used. The document remains NULL until a later backfill/reconciliation pass.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_document_rollback_owner","role":"authenticated"}',
  true
);

do $assert_legacy_write$
declare
  recipe_id uuid;
begin
  select public.recipe_vault_write_recipe(
    'recipe_document_rollback_owner', null,
    '{"title":"Rollback legacy recipe","tags":[]}'::jsonb,
    '[{"display_order":1,"amount":"1 cup","ingredient_name":"rice"}]'::jsonb,
    '[{"step_order":1,"instruction":"Cook the rice."}]'::jsonb
  ) into recipe_id;
  if recipe_id is null or not exists (
    select 1 from public.recipes where id = recipe_id and document is null
  ) then
    raise exception 'legacy recipe write did not work after pre-write rollback';
  end if;
end;
$assert_legacy_write$;

rollback;
