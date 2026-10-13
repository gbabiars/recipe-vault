-- Development-only sample data. This file never creates an identity or stores a credential.
-- Before executing, replace the Clerk user ID below with a local Clerk user.
-- Do not run this against a shared, preview, or production project.

do $seed$
declare
  seed_owner_id text := 'user_replace_with_local_clerk_owner';
begin
  if seed_owner_id = 'user_replace_with_local_clerk_owner' then
    raise exception 'Replace seed_owner_id in supabase/seed.sql with a local Clerk user ID before running this file.';
  end if;

  insert into public.recipes (
    owner_id, title, description, prep_minutes, cook_minutes, total_minutes,
    yield_amount, yield_unit, tags, notes, instructions, ingredients, equipment
  ) values (
    seed_owner_id,
    'Lemon Herb Pasta',
    'A small, non-sensitive local development sample.',
    10,
    15,
    25,
    2,
    'servings',
    array['weeknight', 'pasta'],
    array['Seed data only; safe to remove locally.'],
    array[
      'Cook the pasta in salted water until tender.',
      'Toss with lemon zest, juice, and olive oil.'
    ],
    '[{"name":"spaghetti","amount":"200 g"},{"name":"lemon","amount":"1 each"},{"name":"olive oil","amount":"2 tbsp"}]'::jsonb,
    '[]'::jsonb
  );
end;
$seed$;
