-- Run after applying all migrations to a disposable local Supabase database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--     -f supabase/tests/recipe_document_storage.sql
-- The test uses authenticated JWT claims to check the existing owner RLS on the
-- recipes row. All fixture data is rolled back. It does not call the service role.

begin;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_document_storage_owner","role":"authenticated"}',
  true
);
select set_config('test.recipe_document_token', gen_random_uuid()::text, true);

do $verify$
declare
  recipe_id uuid;
  fixture_title text := 'Recipe document storage test ' || current_setting('test.recipe_document_token');
  document_without_yield jsonb := jsonb_build_object(
    'title', 'Document recipe without yield',
    'description', 'No yield is stated.',
    'time', jsonb_build_object('prepMinutes', 5),
    'ingredients', jsonb_build_array(jsonb_build_object('name', 'onion', 'amount', '1')),
    'equipment', '[]'::jsonb,
    'instructions', jsonb_build_array('Slice the onion.'),
    'notes', '[]'::jsonb,
    'tags', jsonb_build_array('weeknight'),
    'sourceUrl', 'HTTPS://example.com/recipe'
  );
  candidate jsonb;
  invalid_documents jsonb[];
begin
  insert into public.recipes (owner_id, title)
  values ('recipe_document_storage_owner', fixture_title)
  returning id into recipe_id;

  update public.recipes
  set document = document_without_yield
  where id = recipe_id;
  if not found then raise exception 'Owner could not write their own document'; end if;
  if (select title_text from public.recipes where id = recipe_id)
    <> 'Document recipe without yield' then
    raise exception 'Generated title_text did not follow document.title';
  end if;
  if (select revision from public.recipes where id = recipe_id) <> 1 then
    raise exception 'New document revision did not default to 1';
  end if;

  update public.recipes
  set document = document_without_yield || jsonb_build_object(
    'yield', jsonb_build_object('amount', 24, 'unit', 'cookies'),
    'title', 'Document recipe with yield'
  )
  where id = recipe_id;
  if (select title_text from public.recipes where id = recipe_id)
    <> 'Document recipe with yield' then
    raise exception 'Valid document with non-serving yield was rejected or title was stale';
  end if;

  update public.recipes
  set document = document_without_yield || jsonb_build_object(
    'instructions', jsonb_build_array(repeat('x', 5031))
  )
  where id = recipe_id;
  if not found then raise exception 'Maximum duration-extended instruction was rejected'; end if;

  invalid_documents := array[
    document_without_yield || jsonb_build_object('yield', null),
    document_without_yield || jsonb_build_object(
      'yield', jsonb_build_object('amount', 0, 'unit', 'servings')
    ),
    document_without_yield || jsonb_build_object(
      'yield', jsonb_build_object('amount', 2, 'unit', '   ')
    ),
    document_without_yield || jsonb_build_object(
      'ingredients', jsonb_build_array(jsonb_build_object('amount', 1))
    ),
    document_without_yield || jsonb_build_object(
      'ingredients', jsonb_build_array(jsonb_build_object('name', 'onion', 'unexpected', true))
    ),
    document_without_yield || jsonb_build_object(
      'instructions', jsonb_build_array(repeat('x', 5032))
    ),
    document_without_yield - 'instructions',
    document_without_yield - 'ingredients',
    document_without_yield - 'equipment',
    document_without_yield - 'notes',
    document_without_yield - 'tags',
    document_without_yield || jsonb_build_object('time', jsonb_build_object('prepMinutes', -1)),
    document_without_yield || jsonb_build_object('tags', jsonb_build_array('Weeknight')),
    document_without_yield || jsonb_build_object('sourceUrl', 'file:///tmp/recipe'),
    document_without_yield || jsonb_build_object(
      'sourceUrl', 'https://example.com/' || repeat('x', 2000)
    ),
    document_without_yield || jsonb_build_object('id', gen_random_uuid())
  ];

  foreach candidate in array invalid_documents loop
    begin
      update public.recipes set document = candidate where id = recipe_id;
      raise exception 'Invalid recipe document was accepted: %', candidate;
    exception when check_violation then
      null;
    end;
  end loop;

  begin
    update public.recipes set revision = 0 where id = recipe_id;
    raise exception 'Nonpositive revision was accepted';
  exception when check_violation then
    null;
  end;
end;
$verify$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_document_storage_other","role":"authenticated"}',
  true
);

do $verify$
declare
  suffix text := current_setting('test.recipe_document_token');
  visible_rows integer;
  changed_rows integer;
begin
  select count(*) into visible_rows
  from public.recipes
  where title = 'Recipe document storage test ' || suffix;
  if visible_rows <> 0 then raise exception 'Other owner could read document-backed recipe'; end if;

  update public.recipes set document = null
  where title = 'Recipe document storage test ' || suffix;
  get diagnostics changed_rows = row_count;
  if changed_rows <> 0 then raise exception 'Other owner could update document-backed recipe'; end if;
end;
$verify$;

rollback;
