-- Run after migrations on a disposable local Supabase database. Fixtures roll back.
begin;

select set_config('test.recipe_document_search_token', gen_random_uuid()::text, true);

do $fixture$
declare
  suffix text := current_setting('test.recipe_document_search_token');
begin
  insert into public.recipes (owner_id,title,description,cook_minutes,total_minutes,ingredients,equipment,instructions,notes,tags,updated_at)
  values
    (
      'recipe_document_search_owner_a',
      'Orange shortbread ' || suffix,'Crisp cookies with orange zest.',18,null,
      '[{"name":"unsalted butter","amount":"1 cup","note":"softened"},{"name":"100% salt_and_pepper back\\slash","amount":"1","note":"softened"}]'::jsonb,
      '[{"name":"baking sheet","note":"polished"}]'::jsonb,
      array['Cream the butter and sugar.'],array['secret note phrase'],array['baking','quick'],
      '2026-01-01T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Separate phrase parts ' || suffix,'olive',null,null,
      '[{"name":"oil"}]'::jsonb,'[]'::jsonb,array['Mix.'],array[]::text[],array['slow'],
      '2026-01-02T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Cinnamon toast ' || suffix,'An older cinnamon recipe.',9,null,
      '[{"name":"bread"}]'::jsonb,'[]'::jsonb,array['Toast.'],array[]::text[],array['toast'],
      '2026-01-01T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Recent recipe ' || suffix,'A newer recipe with cinnamon in its description.',null,null,
      '[{"name":"rice"}]'::jsonb,'[]'::jsonb,array['Mix.'],array[]::text[],array['new'],
      '2026-01-04T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_b',
      'Other owner ' || suffix,'Crisp cookies with orange zest.',null,null,
      '[{"name":"unsalted butter"}]'::jsonb,'[{"name":"baking sheet"}]'::jsonb,array['Bake.'],array[]::text[],array['baking'],
      '2026-01-03T00:00:00Z'
    );

  insert into public.recipes (owner_id,title,description,total_minutes,ingredients,equipment,instructions,notes,tags,updated_at)
  select
    'recipe_document_search_owner_a',
    'Preference ' || fixture.label || ' ' || suffix,
    'Preference fixture.',
    fixture.total_minutes,
    (
      select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('name', pg_catalog.chr(96 + item.number)))
      from generate_series(1, fixture.ingredient_count) as item(number)
    ),
    '[]'::jsonb,
    array['Mix.'],
    array[]::text[],
    array['preference'],
    fixture.updated_at
  from (values
    ('four ingredients', 4, 25, '2026-01-05T00:00:00Z'::timestamptz),
    ('five ingredients', 5, 20, '2026-01-06T00:00:00Z'::timestamptz),
    ('six ingredients', 6, 10, '2026-01-07T00:00:00Z'::timestamptz),
    ('twenty-nine minutes', 6, 29, '2026-01-07T12:00:00Z'::timestamptz),
    ('exactly thirty', 1, 30, '2026-01-08T00:00:00Z'::timestamptz),
    ('missing total', 1, null::integer, '2026-01-09T00:00:00Z'::timestamptz)
  ) as fixture(label, ingredient_count, total_minutes, updated_at);

  insert into public.recipes (owner_id,title,description,total_minutes,ingredients,equipment,instructions,notes,tags,updated_at)
  select
    'recipe_document_search_owner_a',
    'Pagination fixture recipe ' || suffix || ' ' || series.number,
    'Pagination fixture.',
    12,
    '[{"name":"ingredient"}]'::jsonb,
    '[]'::jsonb,
    array['Mix.'],
    array[]::text[],
    array['pagination'],
    '2026-02-01T00:00:00Z'::timestamptz + series.number * interval '1 second'
  from generate_series(1, 27) as series(number);
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
  easy_result jsonb;
  test_case record;
begin
  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'SHORTBREAD', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1'
    or result -> 'items' -> 0 -> 'document' ->> 'title' not like '% ' || suffix then
    raise exception 'Case-insensitive title search failed: %', result;
  end if;

  for test_case in select * from (values
    ('orange zest', '{}'::text[], 1, 'Description search failed'),
    ('cookie', '{}'::text[], 1, 'English stemming search failed'),
    ('shortbread orange', '{}'::text[], 1, 'Multiple-term search failed'),
    ('butter', '{}'::text[], 1, 'Ingredient-name search failed'),
    ('baking sheet', '{}'::text[], 1, 'Equipment-name search failed'),
    ('BAK', '{}'::text[], 0, 'Partial-token search unexpectedly matched'),
    ('baking', '{}'::text[], 1, 'Tag full-text search failed'),
    ('olive oil', '{}'::text[], 1, 'Terms across fields did not match'),
    ('"olive oil"', '{}'::text[], 0, 'Quoted phrase incorrectly bridged fields'),
    ('orange OR olive', '{}'::text[], 2, 'Web-search OR syntax failed'),
    ('secret note phrase', '{}'::text[], 0, 'Recipe notes unexpectedly matched'),
    ('softened', '{}'::text[], 0, 'Ingredient notes unexpectedly matched'),
    ('100%', '{}'::text[], 1, 'Literal percent search failed'),
    ('salt_and', '{}'::text[], 1, 'Literal underscore search failed'),
    ('back\slash', '{}'::text[], 1, 'Literal backslash search failed'),
    ('shortbread', array['slow', 'quick'], 1, 'Text plus any-selected-tag filter failed'),
    ('shortbread', array['qui'], 0, 'Selected tag matched a partial name')
  ) as cases(search_text, selected_tags, expected_total, error_message)
  loop
    result := public.recipe_vault_search_recipe_documents(
      'recipe_document_search_owner_a', test_case.search_text, test_case.selected_tags, 0, 20
    );
    if (result ->> 'total')::integer <> test_case.expected_total then
      raise exception '%: %', test_case.error_message, result;
    end if;
  end loop;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', null, '{}'::text[], 0, 1
  );
  if result ->> 'total' <> '37' or pg_catalog.jsonb_array_length(result -> 'items') <> 1 then
    raise exception 'Unfiltered count or pagination failed: %', result;
  end if;

  for test_case in select * from (values
    ('easy', 4, 'Preference missing total %', 'Preference exactly thirty %', 'Preference four ingredients %', 'Preference five ingredients %'),
    ('quick', 4, 'Preference six ingredients %', 'Preference five ingredients %', 'Preference four ingredients %', 'Preference twenty-nine minutes %')
  ) as preferences(preference, expected_total, first_title, second_title, third_title, last_title)
  loop
    result := public.recipe_vault_search_recipe_documents(
      'recipe_document_search_owner_a', 'preference', '{}'::text[], 0, 20, test_case.preference
    );
    if (result ->> 'total')::integer <> test_case.expected_total
      or result -> 'items' -> 0 -> 'document' ->> 'title' not like test_case.first_title
      or result -> 'items' -> 1 -> 'document' ->> 'title' not like test_case.second_title
      or result -> 'items' -> 2 -> 'document' ->> 'title' not like test_case.third_title
      or result -> 'items' -> 3 -> 'document' ->> 'title' not like test_case.last_title then
      raise exception 'Preference eligibility or ordering failed for %: %', test_case.preference, result;
    end if;
    if test_case.preference = 'easy' then
      easy_result := result;
    end if;
  end loop;

  if not exists (
      select 1 from pg_catalog.jsonb_array_elements(easy_result -> 'items') as item
      where item -> 'document' ->> 'title' like 'Preference five ingredients %'
    ) or exists (
      select 1 from pg_catalog.jsonb_array_elements(easy_result -> 'items') as item
      where item -> 'document' ->> 'title' like 'Preference six ingredients %'
    ) then
    raise exception 'Easy preference did not include five and exclude six ingredients: %', easy_result;
  end if;

  for test_case in select * from (values
    ('easy-quick', 'Preference four ingredients %', 'Preference five ingredients %'),
    ('quick-easy', 'Preference five ingredients %', 'Preference four ingredients %')
  ) as preferences(preference, first_title, second_title)
  loop
    result := public.recipe_vault_search_recipe_documents(
      'recipe_document_search_owner_a', 'preference', '{}'::text[], 0, 20, test_case.preference
    );
    if result ->> 'total' <> '2'
      or result -> 'items' -> 0 -> 'document' ->> 'title' not like test_case.first_title
      or result -> 'items' -> 1 -> 'document' ->> 'title' not like test_case.second_title then
      raise exception 'Combined preference filters or ranking failed for %: %', test_case.preference, result;
    end if;
  end loop;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'pagination', '{}'::text[], 0, 3, 'quick'
  );
  if result ->> 'total' <> '27' or pg_catalog.jsonb_array_length(result -> 'items') <> 3 then
    raise exception 'Preference count was not computed before pagination: %', result;
  end if;

  -- Existing five-argument calls continue to work and preserve unfiltered behavior.
  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'preference', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '6' then
    raise exception 'Defaulted preference changed the five-argument search behavior: %', result;
  end if;

  begin
    perform public.recipe_vault_search_recipe_documents(
      'recipe_document_search_owner_a', null, '{}'::text[], 0, 20, 'invalid'
    );
    raise exception 'Invalid preference unexpectedly succeeded';
  exception when sqlstate '22023' then
    null;
  end;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'cinnamon', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '2'
    or result -> 'items' -> 0 -> 'document' ->> 'title' not like 'Cinnamon toast %' then
    raise exception 'Title-weighted relevance ranking failed: %', result;
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
    'recipe_document_search_owner_a', null, '{}'::text[], 0, 20, 'quick'
  );
  if result ->> 'total' <> '0' then
    raise exception 'Different authenticated owner read private recipes: %', result;
  end if;
end;
$cross_owner$;

reset role;
update public.recipes
set title = 'Updated search title ' || current_setting('test.recipe_document_search_token')
where owner_id = 'recipe_document_search_owner_a'
  and title = 'Separate phrase parts ' || current_setting('test.recipe_document_search_token');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_document_search_owner_a","role":"authenticated"}',
  true
);

do $verify_generated_document_update$
declare
  result jsonb;
begin
  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'updated search title', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then
    raise exception 'Generated search document did not update: %', result;
  end if;
end;
$verify_generated_document_update$;

reset role;
do $permissions$
begin
  if pg_catalog.has_function_privilege(
    'anon',
    'public.recipe_vault_search_recipe_documents(text,text,text[],integer,integer,text)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous role can execute private recipe search';
  end if;
  if not pg_catalog.has_function_privilege(
    'authenticated',
    'public.recipe_vault_search_recipe_documents(text,text,text[],integer,integer,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role cannot execute private recipe search';
  end if;
  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.recipe_vault_search_recipe_documents(text,text,text[],integer,integer,text)',
    'EXECUTE'
  ) then
    raise exception 'Service role cannot execute private recipe search';
  end if;
end;
$permissions$;

rollback;
