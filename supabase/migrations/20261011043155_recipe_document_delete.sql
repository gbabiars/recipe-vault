-- Owner-bound optimistic deletion for document-backed recipes. Optional audit
-- metadata is handled inside this transaction so failed deletes leave no event.

begin;

create or replace function public.recipe_vault_delete_recipe_document(
  target_owner_id text,
  target_recipe_id uuid,
  target_expected_revision integer,
  target_audit_request_id text default null,
  target_audit_method text default null
)
returns table (status text, recipe_id uuid, revision integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id text := public.recipe_vault_current_clerk_user_id();
  is_service boolean := coalesce((select auth.jwt() ->> 'role') = 'service_role', false);
  current_revision integer;
  deleted_count integer;
begin
  if target_owner_id is null or target_owner_id = '' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not is_service and (
    caller_id is null
    or caller_id <> target_owner_id
  ) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if target_recipe_id is null
    or target_expected_revision is null
    or target_expected_revision < 1
    or ((target_audit_request_id is null) <> (target_audit_method is null)) then
    return query select 'invalid'::text, null::uuid, null::integer;
    return;
  end if;

  perform public.recipe_vault_lock_document_owner(target_owner_id);

  select recipe.revision
  into current_revision
  from public.recipes as recipe
  where recipe.id = target_recipe_id
    and recipe.owner_id = target_owner_id
    and recipe.document is not null
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::integer;
    return;
  end if;

  if current_revision <> target_expected_revision then
    return query select 'conflict'::text, target_recipe_id, current_revision;
    return;
  end if;

  delete from public.recipes as recipe
  where recipe.id = target_recipe_id
    and recipe.owner_id = target_owner_id
    and recipe.revision = target_expected_revision;
  get diagnostics deleted_count = row_count;

  if deleted_count <> 1 then
    return query select 'not_found'::text, null::uuid, null::integer;
    return;
  end if;

  -- Store audit after a successful DELETE, still inside the same transaction.
  -- recipe_id is NULL because the recipe row no longer exists; event_data keeps
  -- the stable ID, matching the existing service audit payload.
  if target_audit_request_id is not null then
    insert into public.recipe_audit_events (
      owner_id, recipe_id, actor_id, event_type, event_data
    ) values (
      target_owner_id,
      null,
      coalesce(caller_id, target_owner_id),
      'recipe.deleted',
      pg_catalog.jsonb_build_object(
        'requestId', target_audit_request_id,
        'method', target_audit_method,
        'recipeId', target_recipe_id
      )
    );
  end if;

  return query select 'deleted'::text, target_recipe_id, current_revision;
end;
$function$;

revoke all on function public.recipe_vault_delete_recipe_document(text, uuid, integer, text, text)
  from public, anon;
grant execute on function public.recipe_vault_delete_recipe_document(text, uuid, integer, text, text)
  to authenticated, service_role;

comment on function public.recipe_vault_delete_recipe_document(text, uuid, integer, text, text) is
  'Deletes an owned document recipe at its expected revision; optional audit event is atomic with successful deletion.';

commit;
