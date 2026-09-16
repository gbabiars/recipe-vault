-- Development-only sample data. This file never creates an Auth user or stores a credential.
-- Before executing, replace the UUID below with an existing LOCAL development Auth user ID.
-- Do not run this against a shared, preview, or production project.

do $seed$
declare
  seed_owner_id uuid := '00000000-0000-0000-0000-000000000000';
  sample_recipe_id uuid;
begin
  if seed_owner_id = '00000000-0000-0000-0000-000000000000' then
    raise exception 'Replace seed_owner_id in supabase/seed.sql with a local Auth user UUID before running this file.';
  end if;

  if not exists (select 1 from auth.users where id = seed_owner_id) then
    raise exception 'The supplied seed_owner_id does not exist in auth.users.';
  end if;

  insert into public.recipes (
    owner_id, title, summary, prep_time_minutes, cook_time_minutes,
    total_time_minutes, servings, tags, dietary_flags, notes
  ) values (
    seed_owner_id, 'Lemon Herb Pasta', 'A small, non-sensitive local development sample.',
    10, 15, 25, 2, array['weeknight', 'pasta'], array['vegetarian'],
    'Seed data only; safe to remove locally.'
  ) returning id into sample_recipe_id;

  insert into public.recipe_ingredients (recipe_id, display_order, quantity, unit, ingredient_name)
  values
    (sample_recipe_id, 1, 200, 'g', 'spaghetti'),
    (sample_recipe_id, 2, 1, 'each', 'lemon'),
    (sample_recipe_id, 3, 2, 'tbsp', 'olive oil');

  insert into public.recipe_steps (recipe_id, step_order, instruction, duration_minutes)
  values
    (sample_recipe_id, 1, 'Cook the pasta in salted water until tender.', 10),
    (sample_recipe_id, 2, 'Toss with lemon zest, juice, and olive oil.', 5);
end;
$seed$;
