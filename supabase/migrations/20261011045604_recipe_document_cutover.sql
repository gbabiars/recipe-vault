-- Final coordinated cutover gate. Deploy only after the write pause, after all
-- recipe documents have been backfilled, and after old app instances are drained.
-- Old normalized storage stays readable for the soak, but is read-only.

begin;

do $precondition$
begin
  if exists (select 1 from public.recipes where document is null) then
    raise exception 'recipe document cutover blocked: recipes.document contains NULL values'
      using errcode = '23502';
  end if;
end;
$precondition$;

alter table public.recipes
  alter column document set not null;

-- Preserve authenticated owner-scoped SELECT grants and policies. Only the
-- document RPCs can mutate recipe rows once this gate is active.
revoke insert, update, delete on public.recipes,
  public.recipe_ingredients,
  public.recipe_steps,
  public.tags,
  public.recipe_tags
from authenticated, service_role;

-- The legacy RPC mutates recipe rows and normalized children. Tag merge and
-- unused-tag cleanup no longer have meaning when recipe documents are canonical.
revoke all on function public.recipe_vault_write_recipe(text, uuid, jsonb, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.recipe_vault_merge_tags(text, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.recipe_vault_delete_unused_tag(text, uuid)
  from public, anon, authenticated, service_role;

-- Assert the new mutation API remains callable by both the session role and
-- the verified service-role adapter. These SECURITY DEFINER RPCs perform the
-- owner binding and optimistic revision checks before writing.
grant execute on function public.recipe_vault_write_recipe_document(text, uuid, integer, jsonb)
  to authenticated, service_role;
grant execute on function public.recipe_vault_delete_recipe_document(text, uuid, integer, text, text)
  to authenticated, service_role;
grant execute on function public.recipe_vault_replace_document_tag(text, text, text)
  to authenticated, service_role;

commit;
