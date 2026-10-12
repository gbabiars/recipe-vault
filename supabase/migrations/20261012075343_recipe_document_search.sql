-- Search each supported document field independently so phrases never bridge
-- a field boundary. Keep all filtering inside the owner-scoped RLS query.
begin;

create function public.recipe_vault_search_recipe_documents(
  target_owner_id text,
  target_search text,
  target_tags text[],
  target_offset integer,
  target_limit integer
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $function$
declare
  search_pattern text;
  result jsonb;
begin
  if target_owner_id is null or target_owner_id = '' then
    raise exception 'Owner is required' using errcode = '22023';
  end if;
  if target_offset is null or target_offset < 0 then
    raise exception 'Offset is invalid' using errcode = '22023';
  end if;
  if target_limit is null or target_limit < 1 or target_limit > 1000 then
    raise exception 'Page size is invalid' using errcode = '22023';
  end if;

  if target_search is not null and pg_catalog.btrim(target_search) <> '' then
    search_pattern := '%' || pg_catalog.replace(
      pg_catalog.replace(
        pg_catalog.replace(pg_catalog.btrim(target_search), E'\\', E'\\\\'),
        '%', E'\\%'
      ),
      '_', E'\\_'
    ) || '%';
  end if;

  with filtered as materialized (
    select recipe.id, recipe.document, recipe.revision, recipe.created_at, recipe.updated_at
    from public.recipes as recipe
    where recipe.owner_id = target_owner_id
      and recipe.document is not null
      and (
        search_pattern is null
        or recipe.document ->> 'title' ilike search_pattern escape E'\\'
        or recipe.document ->> 'description' ilike search_pattern escape E'\\'
        or exists (
          select 1
          from pg_catalog.jsonb_array_elements(recipe.document -> 'ingredients') as ingredient(value)
          where ingredient.value ->> 'name' ilike search_pattern escape E'\\'
        )
        or exists (
          select 1
          from pg_catalog.jsonb_array_elements(recipe.document -> 'equipment') as equipment(value)
          where equipment.value ->> 'name' ilike search_pattern escape E'\\'
        )
        or exists (
          select 1
          from pg_catalog.jsonb_array_elements_text(recipe.document -> 'tags') as tag(name)
          where tag.name ilike search_pattern escape E'\\'
        )
      )
      and (
        coalesce(pg_catalog.cardinality(target_tags), 0) = 0
        or exists (
          select 1
          from pg_catalog.jsonb_array_elements_text(recipe.document -> 'tags') as selected_tag(name)
          where selected_tag.name = any(target_tags)
        )
      )
  ), page as (
    select filtered.id, filtered.document, filtered.revision, filtered.created_at, filtered.updated_at
    from filtered
    order by filtered.updated_at desc, filtered.id asc
    offset target_offset
    limit target_limit
  )
  select pg_catalog.jsonb_build_object(
    'items', coalesce(
      (
        select pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'id', page.id,
            'document', page.document,
            'revision', page.revision,
            'created_at', page.created_at,
            'updated_at', page.updated_at
          ) order by page.updated_at desc, page.id asc
        )
        from page
      ),
      '[]'::jsonb
    ),
    'total', (select pg_catalog.count(*) from filtered)
  ) into result;

  return result;
end;
$function$;

revoke all on function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer)
  from public, anon;
grant execute on function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer)
  to authenticated, service_role;

comment on function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer) is
  'Lists owner-scoped recipe documents using literal substring search in title, description, ingredient names, equipment names, or tags, with optional exact tag filtering.';

commit;
