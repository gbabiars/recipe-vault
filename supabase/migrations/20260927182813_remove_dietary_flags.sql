-- Deploy the application without dietary reads or writes before applying this migration.
-- Replacing the RPC first removes its dependency on the retired column.
create or replace function public.recipe_vault_write_recipe(
  target_owner_id text,
  target_recipe_id uuid,
  recipe_data jsonb,
  ingredient_data jsonb,
  step_data jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  saved_id uuid;
  caller_id text := public.recipe_vault_current_clerk_user_id();
  is_service boolean := (select auth.jwt() ->> 'role') = 'service_role';
begin
  if not is_service and (caller_id is null or caller_id <> target_owner_id) then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if jsonb_typeof(recipe_data) <> 'object' or jsonb_typeof(ingredient_data) <> 'array'
    or jsonb_typeof(step_data) <> 'array' or jsonb_array_length(ingredient_data) = 0
    or jsonb_array_length(step_data) = 0 then
    raise exception 'invalid recipe payload';
  end if;

  if target_recipe_id is null then
    insert into public.recipes (
      owner_id, title, summary, prep_time_minutes, cook_time_minutes,
      total_time_minutes, servings, tags, source_url, notes
    ) values (
      target_owner_id, recipe_data->>'title', recipe_data->>'summary',
      (recipe_data->>'prep_time_minutes')::integer, (recipe_data->>'cook_time_minutes')::integer,
      (recipe_data->>'total_time_minutes')::integer, (recipe_data->>'servings')::integer,
      coalesce(array(select jsonb_array_elements_text(recipe_data->'tags')), '{}'::text[]),
      recipe_data->>'source_url', recipe_data->>'notes'
    ) returning id into saved_id;
  else
    update public.recipes set
      title = recipe_data->>'title', summary = recipe_data->>'summary',
      prep_time_minutes = (recipe_data->>'prep_time_minutes')::integer,
      cook_time_minutes = (recipe_data->>'cook_time_minutes')::integer,
      total_time_minutes = (recipe_data->>'total_time_minutes')::integer,
      servings = (recipe_data->>'servings')::integer,
      tags = coalesce(array(select jsonb_array_elements_text(recipe_data->'tags')), '{}'::text[]),
      source_url = recipe_data->>'source_url', notes = recipe_data->>'notes'
    where id = target_recipe_id and owner_id = target_owner_id
    returning id into saved_id;
    if saved_id is null then return null; end if;
    delete from public.recipe_ingredients where recipe_id = saved_id;
    delete from public.recipe_steps where recipe_id = saved_id;
  end if;

  insert into public.recipe_ingredients (recipe_id, display_order, quantity, unit, ingredient_name, notes)
  select saved_id, item.display_order, item.quantity, item.unit, item.ingredient_name, item.notes
  from jsonb_to_recordset(ingredient_data) as item(
    display_order integer, quantity numeric, unit text, ingredient_name text, notes text
  );
  insert into public.recipe_steps (recipe_id, step_order, instruction, duration_minutes)
  select saved_id, item.step_order, item.instruction, item.duration_minutes
  from jsonb_to_recordset(step_data) as item(
    step_order integer, instruction text, duration_minutes integer
  );
  return saved_id;
end;
$$;
alter table public.recipes drop column dietary_flags;
