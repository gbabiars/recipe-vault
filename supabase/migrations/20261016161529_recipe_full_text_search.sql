begin;

-- Keep the indexed document aligned with the fields exposed to recipe search.
-- The stop-word prefix leaves a positional gap between fields so quoted phrases
-- cannot match by combining the end of one field with the start of another.
create function public.recipe_vault_recipe_search_document(
  target_title text,
  target_description text,
  target_ingredients jsonb,
  target_equipment jsonb,
  target_tags text[]
)
returns pg_catalog.tsvector
language sql immutable parallel safe set search_path = ''
as $function$
  select
    pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.english'::pg_catalog.regconfig,
        coalesce(target_title, '')
      ),
      'A'
    )
    || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.english'::pg_catalog.regconfig,
        'the ' || coalesce(array_to_string(target_tags, ' '), '')
      ),
      'A'
    )
    || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.english'::pg_catalog.regconfig,
        'the ' || coalesce(target_description, '')
      ),
      'B'
    )
    || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.english'::pg_catalog.regconfig,
        'the ' || coalesce(
          (
            select string_agg(ingredient.value ->> 'name', ' ' order by ingredient.ordinality)
            from jsonb_array_elements(coalesce(target_ingredients, '[]'::jsonb))
              with ordinality as ingredient(value, ordinality)
          ),
          ''
        )
      ),
      'C'
    )
    || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.english'::pg_catalog.regconfig,
        'the ' || coalesce(
          (
            select string_agg(equipment.value ->> 'name', ' ' order by equipment.ordinality)
            from jsonb_array_elements(coalesce(target_equipment, '[]'::jsonb))
              with ordinality as equipment(value, ordinality)
          ),
          ''
        )
      ),
      'D'
    );
$function$;

revoke all on function public.recipe_vault_recipe_search_document(text, text, jsonb, jsonb, text[])
  from public, anon;
grant execute on function public.recipe_vault_recipe_search_document(text, text, jsonb, jsonb, text[])
  to authenticated, service_role;

alter table public.recipes
  add column search_document pg_catalog.tsvector generated always as (
    public.recipe_vault_recipe_search_document(title, description, ingredients, equipment, tags)
  ) stored;

create index recipes_search_document_idx
  on public.recipes using gin (search_document);

create or replace function public.recipe_vault_search_recipe_documents(
  target_owner_id text,
  target_search text,
  target_tags text[],
  target_offset integer,
  target_limit integer
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
      end as search_rank
    from public.recipes as recipe
    where recipe.owner_id = target_owner_id
      and (search_query is null or recipe.search_document @@ search_query)
      and (coalesce(cardinality(target_tags), 0) = 0 or recipe.tags && target_tags)
  ),
  page as (
    select *
    from rows
    order by search_rank desc, updated_at desc, id asc
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
          ) order by page.search_rank desc, page.updated_at desc, page.id asc
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

revoke all on function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer)
  from public, anon;
grant execute on function public.recipe_vault_search_recipe_documents(text, text, text[], integer, integer)
  to authenticated, service_role;

commit;
