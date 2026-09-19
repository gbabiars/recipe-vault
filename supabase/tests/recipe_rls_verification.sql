-- Run after the Clerk migration against a disposable local Supabase database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recipe_rls_verification.sql
-- It rolls back every fixture. The JWT claims below model Clerk user IDs.

begin;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_recipe_vault_owner","role":"authenticated"}', true);

insert into public.recipes (owner_id, title, servings)
values ('user_recipe_vault_owner', 'Owner recipe', 2);

do $verify$
declare target_recipe_id uuid;
begin
  select id into target_recipe_id from public.recipes where title = 'Owner recipe';
  if target_recipe_id is null then raise exception 'Owner could not read their own recipe'; end if;

  update public.recipes set title = 'Owner recipe updated' where id = target_recipe_id;
  if not found then raise exception 'Owner could not update their own recipe'; end if;

  perform public.recipe_vault_record_audit_event(target_recipe_id, 'user_recipe_vault_owner', 'recipe.updated', '{"verification":true}');
  if not exists (select 1 from public.recipe_audit_events event where event.recipe_id = target_recipe_id and event.actor_id = 'user_recipe_vault_owner') then
    raise exception 'Owner-scoped audit function did not record an event';
  end if;

  begin
    insert into public.recipe_ingredients (recipe_id, display_order, quantity, unit, ingredient_name)
    values (target_recipe_id, 1, -1, 'g', 'invalid');
    raise exception 'Negative ingredient quantity was accepted';
  exception when check_violation then null;
  end;
  begin
    update public.recipes set servings = 0 where id = target_recipe_id;
    raise exception 'Zero servings was accepted';
  exception when check_violation then null;
  end;
end;
$verify$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_other","role":"authenticated"}', true);

do $verify$
declare
  owner_recipe_id uuid := '00000000-0000-0000-0000-000000000000';
  count_visible integer;
  unauthorized_audit_blocked boolean := false;
begin
  select count(*) into count_visible from public.recipes;
  if count_visible <> 0 then raise exception 'Other user could read a recipe'; end if;
  select count(*) into count_visible from public.recipe_audit_events;
  if count_visible <> 0 then raise exception 'Other user could read audit data'; end if;

  insert into public.recipes (owner_id, title) values ('user_other', 'Other private recipe');
  select count(*) into count_visible from public.recipes;
  if count_visible <> 1 then raise exception 'Second Clerk user could not create a private recipe'; end if;

  begin
    perform public.recipe_vault_record_audit_event(owner_recipe_id, 'user_recipe_vault_owner', 'recipe.updated', '{}');
  exception when raise_exception then
    unauthorized_audit_blocked := true;
  end;
  if not unauthorized_audit_blocked then raise exception 'Other user could write an audit event'; end if;
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
