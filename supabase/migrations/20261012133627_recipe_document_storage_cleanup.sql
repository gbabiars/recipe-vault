-- Remove transitional normalized recipe and tag storage after application
-- instances no longer call its query or mutation paths.
-- Recipe documents, audit history, ownership policies, and document RPCs remain.

begin;

-- Keep a transaction-local snapshot of the retained rows and compare it before
-- commit. This makes the cleanup fail if any recipe or audit record is lost or
-- changed while the legacy schema is removed.
create temporary table recipe_document_cleanup_recipe_snapshot on commit drop as
select id, owner_id, created_at, updated_at, document, revision, title_text
from public.recipes;

create temporary table recipe_document_cleanup_audit_snapshot on commit drop as
select id, pg_catalog.to_jsonb(event) as row_data
from public.recipe_audit_events as event;

-- Replace the staged writer before dropping normalized title/summary columns.
-- The owner lock serializes document tag replacement and recipe writes.
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

  perform public.recipe_vault_lock_document_owner(target_owner_id);

  if target_recipe_id is null then
    begin
      insert into public.recipes as inserted (owner_id, document)
      values (target_owner_id, target_document)
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

-- Stop the compatibility projection before dropping its recipe.tags column and
-- the catalog tables it maintained.
drop trigger if exists recipes_prepare_tags on public.recipes;
drop trigger if exists recipes_sync_tags on public.recipes;
do $drop_legacy_triggers$
begin
  if pg_catalog.to_regclass('public.recipe_tags') is not null then
    execute 'drop trigger if exists recipe_tags_refresh_recipe on public.recipe_tags';
  end if;
  if pg_catalog.to_regclass('public.tags') is not null then
    execute 'drop trigger if exists tags_renamed on public.tags';
    execute 'drop trigger if exists tags_deleting on public.tags';
    execute 'drop trigger if exists tags_set_updated_at on public.tags';
  end if;
end;
$drop_legacy_triggers$;

-- These RPCs and helpers only read or mutate the normalized tag catalog.
drop function if exists public.recipe_vault_write_recipe(text, uuid, jsonb, jsonb, jsonb);
drop function if exists public.recipe_vault_list_tag_inventory(text, text, text, text, bigint, text, uuid, integer, bigint, text, uuid);
drop function if exists public.recipe_vault_delete_unused_tag(text, uuid);
drop function if exists public.recipe_vault_merge_tags(text, uuid, uuid);
drop function if exists public.recipe_vault_prepare_recipe_tags();
drop function if exists public.recipe_vault_sync_recipe_tags();
drop function if exists public.recipe_vault_recipe_tags_changed();
drop function if exists public.recipe_vault_tag_changed();
drop function if exists public.recipe_vault_refresh_recipe_tag_names(uuid);

-- Child tables and catalog metadata have no representation in recipe documents.
-- Drop the tag link table first so its composite foreign key no longer needs
-- recipes(owner_id, id); ownership on recipes itself is preserved.
drop table if exists public.recipe_tags;
alter table public.recipes drop constraint if exists recipes_owner_id_id_unique;
drop table if exists public.tags;
drop table if exists public.recipe_ingredients;
drop table if exists public.recipe_steps;

-- The named tag constraint references recipe_vault_valid_labels. Drop it before
-- removing the legacy projection column and its validation helper.
alter table public.recipes drop constraint if exists recipes_tags_check;
alter table public.recipes
  drop column if exists title,
  drop column if exists summary,
  drop column if exists prep_time_minutes,
  drop column if exists cook_time_minutes,
  drop column if exists total_time_minutes,
  drop column if exists servings,
  drop column if exists tags,
  drop column if exists source_url,
  drop column if exists notes;

drop function if exists public.recipe_vault_canonical_tags(text[]);
drop function if exists public.recipe_vault_canonical_tag_name(text);
drop function if exists public.recipe_vault_valid_labels(text[]);

-- recipe_vault_set_updated_at() remains in use by recipes_set_updated_at.
-- recipe_vault_current_clerk_user_id(), audit functions, document mutation
-- functions, and document tag functions remain part of the active contract.

do $verify_preserved_rows$
begin
  if exists (
    select 1
    from recipe_document_cleanup_recipe_snapshot as before
    full join public.recipes as after using (id)
    where before.id is null
      or after.id is null
      or before.owner_id is distinct from after.owner_id
      or before.created_at is distinct from after.created_at
      or before.updated_at is distinct from after.updated_at
      or before.document is distinct from after.document
      or before.revision is distinct from after.revision
      or before.title_text is distinct from after.title_text
  ) then
    raise exception 'recipe document cleanup changed or removed retained recipe data';
  end if;

  if exists (
    select 1
    from recipe_document_cleanup_audit_snapshot as before
    full join public.recipe_audit_events as after using (id)
    where before.id is null
      or after.id is null
      or before.row_data is distinct from pg_catalog.to_jsonb(after)
  ) then
    raise exception 'recipe document cleanup changed or removed audit history';
  end if;
end;
$verify_preserved_rows$;

commit;
