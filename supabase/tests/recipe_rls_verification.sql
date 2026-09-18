-- Run after the Clerk migration against a disposable local Supabase database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recipe_rls_verification.sql
-- It rolls back every fixture. The JWT claims below model Clerk user IDs.

begin;

insert into public.recipe_vault_private_owners (user_id) values ('user_recipe_vault_owner');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_recipe_vault_owner","role":"authenticated"}', true);

insert into public.recipes (owner_id, title, servings)
values ('user_recipe_vault_owner', 'Owner recipe', 2);

do $verify$
declare recipe_id uuid;
begin
  select id into recipe_id from public.recipes where title = 'Owner recipe';
  if recipe_id is null then raise exception 'Owner could not read their own recipe'; end if;

  update public.recipes set title = 'Owner recipe updated' where id = recipe_id;
  if not found then raise exception 'Owner could not update their own recipe'; end if;

  perform public.recipe_vault_record_audit_event(recipe_id, 'user_recipe_vault_owner', 'recipe.updated', '{"verification":true}');
  if not exists (select 1 from public.recipe_audit_events event where event.recipe_id = recipe_id and event.actor_id = 'user_recipe_vault_owner') then
    raise exception 'Owner-scoped audit function did not record an event';
  end if;

  begin
    insert into public.recipe_ingredients (recipe_id, display_order, quantity, unit, ingredient_name)
    values (recipe_id, 1, -1, 'g', 'invalid');
    raise exception 'Negative ingredient quantity was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.recipes set servings = 0 where id = recipe_id;
    raise exception 'Zero servings was accepted';
  exception when check_violation then null;
  end;
end;
$verify$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_other","role":"authenticated"}', true);

do $verify$
declare recipe_id uuid := '00000000-0000-0000-0000-000000000000'; count_visible integer;
begin
  select count(*) into count_visible from public.recipes;
  if count_visible <> 0 then raise exception 'Other user could read a recipe'; end if;
  select count(*) into count_visible from public.recipe_audit_events;
  if count_visible <> 0 then raise exception 'Other user could read audit data'; end if;

  begin
    insert into public.recipes (owner_id, title) values ('user_other', 'Unauthorized');
    raise exception 'Other user could create a recipe';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.recipe_vault_record_audit_event(recipe_id, 'user_recipe_vault_owner', 'recipe.updated', '{}');
    raise exception 'Other user could write an audit event';
  exception when raise_exception then null;
  end;
end;
$verify$;

reset role;
set local role anon;
do $verify$
begin
  begin
    perform 1 from public.recipes;
    raise exception 'Anonymous user could query recipes';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

rollback;
