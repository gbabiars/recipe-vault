-- Shared transaction lock for document writes that change tag membership.
-- All document recipe create/replace/delete RPCs must take this owner lock
-- before reading or changing document.tags so a bulk replacement cannot race.

begin;

create function public.recipe_vault_lock_document_owner(target_owner_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id text := public.recipe_vault_current_clerk_user_id();
  is_service boolean := coalesce((select auth.jwt() ->> 'role') = 'service_role', false);
begin
  if target_owner_id is null or target_owner_id = '' then
    raise exception 'invalid owner' using errcode = '22023';
  end if;
  if not is_service and (caller_id is null or caller_id <> target_owner_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(target_owner_id, 726384::bigint)
  );
end;
$function$;

revoke all on function public.recipe_vault_lock_document_owner(text) from public, anon;
grant execute on function public.recipe_vault_lock_document_owner(text) to authenticated, service_role;

comment on function public.recipe_vault_lock_document_owner(text) is
  'Acquires the shared transaction-level owner lock required before inspecting or changing recipe document tags.';

create function public.recipe_vault_replace_document_tag(
  target_owner_id text,
  source_name text,
  target_name text
)
returns table (status text, changed_recipes integer)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  caller_id text := public.recipe_vault_current_clerk_user_id();
  is_service boolean := coalesce((select auth.jwt() ->> 'role') = 'service_role', false);
  changed_count integer;
begin
  if target_owner_id is null or target_owner_id = '' then
    raise exception 'invalid owner' using errcode = '22023';
  end if;
  if not is_service and (caller_id is null or caller_id <> target_owner_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  if source_name is null or target_name is null
    or pg_catalog.char_length(source_name) not between 1 and 64
    or pg_catalog.char_length(target_name) not between 1 and 64
    or source_name !~ '^[a-z0-9]([a-z0-9_-]| [a-z0-9])*$'
    or target_name !~ '^[a-z0-9]([a-z0-9_-]| [a-z0-9])*$'
    or source_name = target_name then
    raise exception 'invalid canonical tag name' using errcode = '22023';
  end if;

  -- This exact owner lock is shared with future document recipe mutation RPCs.
  -- Take it before checking whether the source tag currently exists.
  perform public.recipe_vault_lock_document_owner(target_owner_id);

  -- Lock affected rows in primary-key order, then re-evaluate membership while
  -- holding the owner lock. The second predicate protects against writers that
  -- do not yet participate in the owner-lock protocol during staged rollout.
  perform recipe.id
  from public.recipes as recipe
  where recipe.owner_id = target_owner_id
    and recipe.document is not null
    and recipe.document -> 'tags' @> pg_catalog.jsonb_build_array(source_name)
  order by recipe.id
  for update;

  if not found then
    return query select 'source_missing'::text, 0;
    return;
  end if;

  with expanded as materialized (
    select
      recipe.id as recipe_id,
      case when tag.tag_name = source_name then target_name else tag.tag_name end as tag_name,
      tag.position
    from public.recipes as recipe
    cross join lateral pg_catalog.jsonb_array_elements_text(recipe.document -> 'tags')
      with ordinality as tag(tag_name, position)
    where recipe.owner_id = target_owner_id
      and recipe.document is not null
      and recipe.document -> 'tags' @> pg_catalog.jsonb_build_array(source_name)
  ), deduplicated as (
    select
      expanded.recipe_id,
      expanded.tag_name,
      expanded.position,
      pg_catalog.row_number() over (
        partition by expanded.recipe_id, expanded.tag_name
        order by expanded.position
      ) as duplicate_number
    from expanded
  ), replacement_tags as (
    select
      deduplicated.recipe_id,
      pg_catalog.jsonb_agg(deduplicated.tag_name order by deduplicated.position) as tags
    from deduplicated
    where deduplicated.duplicate_number = 1
    group by deduplicated.recipe_id
  )
  update public.recipes as recipe
  set document = pg_catalog.jsonb_set(recipe.document, '{tags}', replacement_tags.tags, false),
      revision = recipe.revision + 1,
      updated_at = pg_catalog.now()
  from replacement_tags
  where recipe.id = replacement_tags.recipe_id
    and recipe.owner_id = target_owner_id
    and recipe.document -> 'tags' @> pg_catalog.jsonb_build_array(source_name);

  get diagnostics changed_count = row_count;
  return query select 'replaced'::text, changed_count;
end;
$function$;

revoke all on function public.recipe_vault_replace_document_tag(text, text, text) from public, anon;
grant execute on function public.recipe_vault_replace_document_tag(text, text, text)
  to authenticated, service_role;

commit;
