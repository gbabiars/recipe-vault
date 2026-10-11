-- Atomically create or replace a validated recipe document.
-- Legacy fields remain in place for staged rollout; this writer does not
-- deliberately write ingredient, step, or tag association tables.

begin;

create or replace function public.recipe_vault_write_recipe_document(
  target_owner_id text,
  target_recipe_id uuid,
  target_expected_revision integer,
  target_document jsonb
)
returns table (status text, recipe_id uuid, revision integer, document jsonb)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id text := public.recipe_vault_current_clerk_user_id();
  is_service boolean := coalesce((select auth.jwt() ->> 'role') = 'service_role', false);
  saved_id uuid;
  saved_revision integer;
  saved_document jsonb;
begin
  if target_owner_id is null or target_owner_id = '' then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if not is_service and (caller_id is null or caller_id <> target_owner_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if target_document is null
    or pg_catalog.jsonb_typeof(target_document) is distinct from 'object'
    or (target_recipe_id is null) <> (target_expected_revision is null)
    or (target_recipe_id is not null and target_expected_revision < 1) then
    return query select 'invalid'::text, null::uuid, null::integer, null::jsonb;
    return;
  end if;

  -- The document tag membership and legacy tag replacement RPC share this
  -- transaction lock. Acquire it before create/replace operations.
  perform public.recipe_vault_lock_document_owner(target_owner_id);

  if target_recipe_id is null then
    begin
      insert into public.recipes as inserted (owner_id, title, summary, document)
      values (
        target_owner_id,
        target_document ->> 'title',
        nullif(pg_catalog.btrim(target_document ->> 'description'), ''),
        target_document
      )
      returning inserted.id, inserted.revision, inserted.document
      into saved_id, saved_revision, saved_document;
    exception
      when check_violation or not_null_violation or string_data_right_truncation then
        return query select 'invalid'::text, null::uuid, null::integer, null::jsonb;
        return;
    end;

    return query select 'saved'::text, saved_id, saved_revision, saved_document;
    return;
  end if;

  select recipe.revision
  into saved_revision
  from public.recipes as recipe
  where recipe.id = target_recipe_id
    and recipe.owner_id = target_owner_id
  for update;

  if not found then
    return query select 'not_found'::text, null::uuid, null::integer, null::jsonb;
    return;
  end if;

  if saved_revision <> target_expected_revision then
    return query select 'conflict'::text, target_recipe_id, saved_revision, null::jsonb;
    return;
  end if;

  begin
    update public.recipes as recipe
    set document = target_document,
        revision = recipe.revision + 1
    where recipe.id = target_recipe_id
      and recipe.owner_id = target_owner_id
      and recipe.revision = target_expected_revision
    returning recipe.revision, recipe.document
    into saved_revision, saved_document;
    if not found then
      -- The row lock should make this unreachable, but retain a conditional
      -- revision predicate as a second guard against stale writes.
      return query select 'conflict'::text, target_recipe_id, null::integer, null::jsonb;
      return;
    end if;
  exception
    when check_violation or not_null_violation or string_data_right_truncation then
      return query select 'invalid'::text, null::uuid, null::integer, null::jsonb;
      return;
  end;

  return query select 'saved'::text, target_recipe_id, saved_revision, saved_document;
end;
$function$;

revoke all on function public.recipe_vault_write_recipe_document(text, uuid, integer, jsonb)
  from public, anon;
grant execute on function public.recipe_vault_write_recipe_document(text, uuid, integer, jsonb)
  to authenticated, service_role;

comment on function public.recipe_vault_write_recipe_document(text, uuid, integer, jsonb) is
  'Creates or revision-checks a complete recipe document after binding owner identity to the Clerk JWT or verified service-role claim.';

commit;
