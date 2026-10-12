-- Run after migrations on a disposable local Supabase database. Fixtures roll back.
begin;

select set_config('test.recipe_document_search_token', gen_random_uuid()::text, true);

do $fixture$
declare
  suffix text := current_setting('test.recipe_document_search_token');
begin
  insert into public.recipes (owner_id, document, updated_at)
  values
    (
      'recipe_document_search_owner_a',
      jsonb_build_object(
        'title', 'Orange shortbread ' || suffix,
        'description', 'Crisp cookies with orange zest.',
        'time', jsonb_build_object('cookMinutes', 18),
        'ingredients', jsonb_build_array(
          jsonb_build_object('name', 'unsalted butter', 'amount', '1 cup', 'note', 'softened'),
          jsonb_build_object('name', '100% salt_and_pepper back\slash', 'amount', '1', 'note', 'softened')
        ),
        'equipment', jsonb_build_array(jsonb_build_object('name', 'baking sheet', 'note', 'polished')),
        'instructions', jsonb_build_array('Cream the butter and sugar.'),
        'notes', jsonb_build_array('secret note phrase'),
        'tags', jsonb_build_array('baking', 'quick')
      ),
      '2026-01-01T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      jsonb_build_object(
        'title', 'Separate phrase parts ' || suffix,
        'description', 'olive',
        'time', '{}'::jsonb,
        'ingredients', jsonb_build_array(jsonb_build_object('name', 'oil')),
        'equipment', jsonb_build_array(),
        'instructions', jsonb_build_array('Mix.'),
        'notes', jsonb_build_array(),
        'tags', jsonb_build_array('slow')
      ),
      '2026-01-02T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_b',
      jsonb_build_object(
        'title', 'Other owner ' || suffix,
        'description', 'Crisp cookies with orange zest.',
        'time', '{}'::jsonb,
        'ingredients', jsonb_build_array(jsonb_build_object('name', 'unsalted butter')),
        'equipment', jsonb_build_array(jsonb_build_object('name', 'baking sheet')),
        'instructions', jsonb_build_array('Bake.'),
        'notes', jsonb_build_array(),
        'tags', jsonb_build_array('baking')
      ),
      '2026-01-03T00:00:00Z'
    );
end;
$fixture$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_document_search_owner_a","role":"authenticated"}',
  true
);

do $verify$
declare
  suffix text := current_setting('test.recipe_document_search_token');
  result jsonb;
begin
  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'SHORTBREAD', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1'
    or result -> 'items' -> 0 -> 'document' ->> 'title' not like '% ' || suffix then
    raise exception 'Case-insensitive title search failed: %', result;
  end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'orange zest', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Description search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'butter', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Ingredient-name search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'baking sheet', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Equipment-name search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'BAK', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Tag substring search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'olive oil', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '0' then raise exception 'Phrase incorrectly bridged fields: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'secret note phrase', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '0' then raise exception 'Recipe notes unexpectedly matched: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'softened', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '0' then raise exception 'Ingredient notes unexpectedly matched: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', '100%', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Literal percent search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'salt_and', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Literal underscore search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'back\slash', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Literal backslash search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'shortbread', array['slow', 'quick'], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Text plus any-selected-tag filter failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'shortbread', array['qui'], 0, 20
  );
  if result ->> 'total' <> '0' then raise exception 'Selected tag matched a partial name: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', null, '{}'::text[], 0, 1
  );
  if result ->> 'total' <> '2' or pg_catalog.jsonb_array_length(result -> 'items') <> 1 then
    raise exception 'Unfiltered count or pagination failed: %', result;
  end if;
end;
$verify$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_document_search_owner_b","role":"authenticated"}',
  true
);

do $cross_owner$
declare
  result jsonb;
begin
  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', null, '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '0' then
    raise exception 'Different authenticated owner read private recipes: %', result;
  end if;
end;
$cross_owner$;

reset role;
do $permissions$
begin
  if pg_catalog.has_function_privilege(
    'anon',
    'public.recipe_vault_search_recipe_documents(text,text,text[],integer,integer)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous role can execute private recipe search';
  end if;
end;
$permissions$;

rollback;
