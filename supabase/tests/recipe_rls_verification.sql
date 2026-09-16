-- Run after the migration against a disposable local Supabase database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/recipe_rls_verification.sql
-- It rolls back every fixture, including the two synthetic Auth identities.

begin;

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipe-vault-owner@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'recipe-vault-other@example.test', 'not-a-real-password', now(), '{"provider":"email","providers":["email"]}', '{}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

insert into public.recipes (owner_id, title, servings)
values ('11111111-1111-1111-1111-111111111111', 'Owner recipe', 2);

do $verify$
declare recipe_id uuid;
begin
  select id into recipe_id from public.recipes where title = 'Owner recipe';
  if recipe_id is null then raise exception 'Owner could not read their own recipe'; end if;

  update public.recipes set title = 'Owner recipe updated' where id = recipe_id;
  if not found then raise exception 'Owner could not update their own recipe'; end if;

  perform public.recipe_vault_record_audit_event(recipe_id, '11111111-1111-1111-1111-111111111111', 'recipe.updated', '{"verification":true}');
  if not exists (select 1 from public.recipe_audit_events event where event.recipe_id = recipe_id and event.actor_id = '11111111-1111-1111-1111-111111111111') then
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
  begin
    insert into public.recipe_steps (recipe_id, step_order, instruction, duration_minutes)
    values (recipe_id, 0, 'invalid order', 1);
    raise exception 'Invalid step order was accepted';
  exception when check_violation then null;
  end;
  begin
    insert into public.recipe_steps (recipe_id, step_order, instruction, duration_minutes)
    values (recipe_id, 1, 'invalid duration', -1);
    raise exception 'Negative duration was accepted';
  exception when check_violation then null;
  end;
end;
$verify$;

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);

do $verify$
declare recipe_id uuid := '00000000-0000-0000-0000-000000000000'; count_visible integer;
begin
  select count(*) into count_visible from public.recipes;
  if count_visible <> 0 then raise exception 'Other owner could read a recipe'; end if;
  select count(*) into count_visible from public.recipe_audit_events;
  if count_visible <> 0 then raise exception 'Other owner could read audit data'; end if;

  update public.recipes set title = 'Unauthorized' where title = 'Owner recipe updated';
  if found then raise exception 'Other owner could update a recipe'; end if;
  delete from public.recipes where title = 'Owner recipe updated';
  if found then raise exception 'Other owner could delete a recipe'; end if;

  begin
    update public.recipe_audit_events set event_type = 'tampered';
    raise exception 'Authenticated user could update audit data';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.recipe_audit_events;
    raise exception 'Authenticated user could delete audit data';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.recipe_vault_record_audit_event(recipe_id, '11111111-1111-1111-1111-111111111111', 'recipe.updated', '{}');
    raise exception 'Other owner could write an audit event';
  exception when raise_exception then null;
  end;
end;
$verify$;

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

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $verify$
begin
  delete from public.recipes where title = 'Owner recipe updated';
  if not found then raise exception 'Owner could not delete their own recipe'; end if;
end;
$verify$;

rollback;
