-- Add document-derived tag reads alongside the legacy tag catalog.
-- All names and counts come only from recipe documents; no tag metadata is read.

begin;

create function public.recipe_vault_list_document_tag_inventory(
  target_owner_id text,
  target_search text,
  target_sort text,
  after_usage_count bigint,
  after_name text,
  target_limit integer
)
returns table (name text, usage_count bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $function$
begin
  if target_sort is null or target_sort not in ('name_asc', 'usage_desc', 'usage_asc') then
    raise exception 'Invalid tag sort order' using errcode = '22023';
  end if;
  if target_limit is null or target_limit < 1 or target_limit > 100 then
    raise exception 'Invalid tag page size' using errcode = '22023';
  end if;
  if target_sort = 'name_asc' and after_usage_count is not null
    or target_sort <> 'name_asc' and (after_usage_count is null) <> (after_name is null) then
    raise exception 'Tag cursor does not match the selected sort order' using errcode = '22023';
  end if;

  return query
  with recipe_tags as (
    select recipe.id as recipe_id, tag.tag_name
    from public.recipes as recipe
    cross join lateral pg_catalog.jsonb_array_elements_text(recipe.document -> 'tags') as tag(tag_name)
    where recipe.owner_id = target_owner_id
      and recipe.document is not null
  ), inventory as (
    select recipe_tags.tag_name, pg_catalog.count(distinct recipe_tags.recipe_id) as used_by
    from recipe_tags
    where target_search is null
      or pg_catalog.strpos(pg_catalog.lower(recipe_tags.tag_name), pg_catalog.lower(pg_catalog.btrim(target_search))) > 0
    group by recipe_tags.tag_name
  )
  select inventory.tag_name, inventory.used_by
  from inventory
  where after_name is null
    or target_sort = 'name_asc' and inventory.tag_name > after_name
    or target_sort = 'usage_asc' and (inventory.used_by, inventory.tag_name) > (after_usage_count, after_name)
    or target_sort = 'usage_desc'
      and (inventory.used_by < after_usage_count
        or inventory.used_by = after_usage_count and inventory.tag_name > after_name)
  order by
    case when target_sort = 'name_asc' then inventory.tag_name end asc,
    case when target_sort = 'usage_asc' then inventory.used_by end asc,
    case when target_sort = 'usage_desc' then inventory.used_by end desc,
    case when target_sort <> 'name_asc' then inventory.tag_name end asc
  limit target_limit;
end;
$function$;

revoke all on function public.recipe_vault_list_document_tag_inventory(text, text, text, bigint, text, integer)
  from public, anon;
grant execute on function public.recipe_vault_list_document_tag_inventory(text, text, text, bigint, text, integer)
  to authenticated, service_role;

create function public.recipe_vault_list_recipe_ids_by_document_tag(
  target_owner_id text,
  target_tag_name text
)
returns table (recipe_id uuid)
language sql
stable
security invoker
set search_path = ''
as $function$
  select recipe.id
  from public.recipes as recipe
  where recipe.owner_id = target_owner_id
    and recipe.document is not null
    and recipe.document -> 'tags' @> pg_catalog.jsonb_build_array(target_tag_name)
  order by recipe.id;
$function$;

revoke all on function public.recipe_vault_list_recipe_ids_by_document_tag(text, text)
  from public, anon;
grant execute on function public.recipe_vault_list_recipe_ids_by_document_tag(text, text)
  to authenticated, service_role;

commit;
