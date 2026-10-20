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
      'recipe_document_search_owner_a',
      'Preference four ingredients ' || suffix,'Preference fixture.',null,25,
      '[{"name":"a"},{"name":"b"},{"name":"c"},{"name":"d"}]'::jsonb,
      '[]'::jsonb,array['Mix.'],array[]::text[],array['preference'],
      '2026-01-05T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Preference five ingredients ' || suffix,'Preference fixture.',null,20,
      '[{"name":"a"},{"name":"b"},{"name":"c"},{"name":"d"},{"name":"e"}]'::jsonb,
      '[]'::jsonb,array['Mix.'],array[]::text[],array['preference'],
      '2026-01-06T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Preference six ingredients ' || suffix,'Preference fixture.',null,10,
      '[{"name":"a"},{"name":"b"},{"name":"c"},{"name":"d"},{"name":"e"},{"name":"f"}]'::jsonb,
      '[]'::jsonb,array['Mix.'],array[]::text[],array['preference'],
      '2026-01-07T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Preference twenty-nine minutes ' || suffix,'Preference fixture.',null,29,
      '[{"name":"a"},{"name":"b"},{"name":"c"},{"name":"d"},{"name":"e"},{"name":"f"}]'::jsonb,
      '[]'::jsonb,array['Mix.'],array[]::text[],array['preference'],
      '2026-01-07T12:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Preference exactly thirty ' || suffix,'Preference fixture.',null,30,
      '[{"name":"a"}]'::jsonb,'[]'::jsonb,array['Mix.'],array[]::text[],array['preference'],
      '2026-01-08T00:00:00Z'
    ),
    (
      'recipe_document_search_owner_a',
      'Preference missing total ' || suffix,'Preference fixture.',null,null,
      '[{"name":"a"}]'::jsonb,'[]'::jsonb,array['Mix.'],array[]::text[],array['preference'],
      '2026-01-09T00:00:00Z'
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
    'recipe_document_search_owner_a', 'cookie', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'English stemming search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'shortbread orange', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Multiple-term search failed: %', result; end if;

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
  if result ->> 'total' <> '0' then raise exception 'Partial-token search unexpectedly matched: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'baking', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Tag full-text search failed: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'olive oil', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '1' then raise exception 'Terms across fields did not match: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', '"olive oil"', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '0' then raise exception 'Quoted phrase incorrectly bridged fields: %', result; end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'orange OR olive', '{}'::text[], 0, 20
  );
  if result ->> 'total' <> '2' then raise exception 'Web-search OR syntax failed: %', result; end if;

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
  if result ->> 'total' <> '37' or pg_catalog.jsonb_array_length(result -> 'items') <> 1 then
    raise exception 'Unfiltered count or pagination failed: %', result;
  end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'preference', '{}'::text[], 0, 20, 'easy'
  );
  if result ->> 'total' <> '4'
    or exists (
      select 1 from pg_catalog.jsonb_array_elements(result -> 'items') as item
      where item -> 'document' ->> 'title' like 'Preference six ingredients %'
    ) then
    raise exception 'Easy preference did not enforce the five-ingredient limit: %', result;
  end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'preference', '{}'::text[], 0, 20, 'quick'
  );
  if result ->> 'total' <> '4'
    or result -> 'items' -> 0 -> 'document' ->> 'title' not like 'Preference six ingredients %'
    or result -> 'items' -> 1 -> 'document' ->> 'title' not like 'Preference five ingredients %'
    or result -> 'items' -> 2 -> 'document' ->> 'title' not like 'Preference four ingredients %'
    or result -> 'items' -> 3 -> 'document' ->> 'title' not like 'Preference twenty-nine minutes %' then
    raise exception 'Quick preference did not enforce the 29/30-minute boundary or exclude missing totals: %', result;
  end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'preference', '{}'::text[], 0, 20, 'easy-quick'
  );
  if result ->> 'total' <> '2'
    or result -> 'items' -> 0 -> 'document' ->> 'title' not like 'Preference four ingredients %'
    or result -> 'items' -> 1 -> 'document' ->> 'title' not like 'Preference five ingredients %' then
    raise exception 'Easy-quick did not apply both filters: %', result;
  end if;

  result := public.recipe_vault_search_recipe_documents(
    'recipe_document_search_owner_a', 'preference', '{}'::text[], 0, 20, 'quick-easy'
  );
  if result ->> 'total' <> '2'
    or result -> 'items' -> 0 -> 'document' ->> 'title' not like 'Preference five ingredients %'
    or result -> 'items' -> 1 -> 'document' ->> 'title' not like 'Preference four ingredients %' then
    raise exception 'Quick-easy did not reverse preference ranking: %', result;
  end if;

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
