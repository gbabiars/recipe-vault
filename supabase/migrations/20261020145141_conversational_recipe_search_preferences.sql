begin;

-- PostgreSQL cannot change a function's argument list with CREATE OR REPLACE.
-- Dropping the old signature lets its defaulted sixth argument preserve
-- existing five-argument SQL call sites.
drop function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer);

create function public.recipe_vault_search_recipe_documents(
  target_owner_id text,
  target_search text,
  target_tags text[],
  target_offset integer,
  target_limit integer,
  target_preference text default null
)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $function$
declare
  search_query pg_catalog.tsquery;
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
  if target_preference is not null and target_preference not in (
    'easy', 'quick', 'easy-quick', 'quick-easy'
  ) then
    raise exception 'Preference is invalid' using errcode = '22023';
  end if;

  if target_search is not null and btrim(target_search) <> '' then
    search_query := pg_catalog.websearch_to_tsquery(
      'pg_catalog.english'::pg_catalog.regconfig,
      btrim(target_search)
    );
  end if;

  with rows as materialized (
    select
      recipe.id,
      recipe.title,
      recipe.description,
      recipe.source_url,
      recipe.prep_minutes,
      recipe.cook_minutes,
      recipe.total_minutes,
      recipe.yield_amount,
      recipe.yield_unit,
      recipe.ingredients,
      recipe.equipment,
      recipe.instructions,
      recipe.notes,
      recipe.tags,
      recipe.revision,
      recipe.created_at,
      recipe.updated_at,
      case
        when search_query is null then 0::real
        else pg_catalog.ts_rank_cd(recipe.search_document, search_query)
      end as search_rank,
      pg_catalog.jsonb_array_length(coalesce(recipe.ingredients, '[]'::jsonb)) as ingredient_count
    from public.recipes as recipe
    where recipe.owner_id = target_owner_id
      and (search_query is null or recipe.search_document @@ search_query)
      and (coalesce(cardinality(target_tags), 0) = 0 or recipe.tags && target_tags)
      and (target_preference is null or target_preference not in ('easy', 'easy-quick', 'quick-easy')
        or pg_catalog.jsonb_array_length(coalesce(recipe.ingredients, '[]'::jsonb)) <= 5)
      and (target_preference is null or target_preference not in ('quick', 'easy-quick', 'quick-easy')
        or recipe.total_minutes < 30)
  ),
  page as (
    select *
    from rows
    order by
      case when target_preference in ('easy', 'easy-quick') then ingredient_count end asc nulls last,
      case when target_preference in ('quick', 'quick-easy') then total_minutes end asc nulls last,
      case when target_preference = 'quick-easy' then ingredient_count end asc nulls last,
      case when target_preference = 'easy-quick' then total_minutes end asc nulls last,
      search_rank desc,
      updated_at desc,
      id asc
    offset target_offset
    limit target_limit
  )
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', page.id,
            'document', jsonb_strip_nulls(jsonb_build_object(
              'title', page.title,
              'description', page.description,
              'sourceUrl', page.source_url,
              'time', jsonb_strip_nulls(jsonb_build_object(
                'prepMinutes', page.prep_minutes,
                'cookMinutes', page.cook_minutes,
                'totalMinutes', page.total_minutes
              )),
              'yield', case when page.yield_amount is null then null
                else jsonb_build_object('amount', page.yield_amount, 'unit', page.yield_unit)
              end,
              'ingredients', page.ingredients,
              'equipment', page.equipment,
              'instructions', to_jsonb(page.instructions),
              'notes', to_jsonb(page.notes),
              'tags', to_jsonb(page.tags)
            )),
            'revision', page.revision,
            'created_at', page.created_at,
            'updated_at', page.updated_at
          ) order by
            case when target_preference in ('easy', 'easy-quick') then page.ingredient_count end asc nulls last,
            case when target_preference in ('quick', 'quick-easy') then page.total_minutes end asc nulls last,
            case when target_preference = 'quick-easy' then page.ingredient_count end asc nulls last,
            case when target_preference = 'easy-quick' then page.total_minutes end asc nulls last,
            page.search_rank desc,
            page.updated_at desc,
            page.id asc
        )
        from page
      ),
      '[]'::jsonb
    ),
    'total', (select count(*) from rows)
  ) into result;

  return result;
end;
$function$;

revoke all on function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer, text)
  from public, anon;
grant execute on function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer, text)
  to authenticated, service_role;

commit;
