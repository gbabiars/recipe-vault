-- Development-only sample data. This file never creates an identity or stores a credential.
-- Before executing, replace the Clerk user ID below and add it to
-- recipe_vault_private_owners through the local SQL editor.
-- Do not run this against a shared, preview, or production project.

do $seed$
declare
  seed_owner_id text := 'user_replace_with_local_clerk_owner';
  sample_recipe_id uuid;
begin
  if seed_owner_id = 'user_replace_with_local_clerk_owner' then
    raise exception 'Replace seed_owner_id in supabase/seed.sql with a local Clerk user ID before running this file.';
  end if;

  if not exists (select 1 from public.recipe_vault_private_owners where user_id = seed_owner_id) then
    raise exception 'Add the supplied Clerk user ID to recipe_vault_private_owners before running this seed.';
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
