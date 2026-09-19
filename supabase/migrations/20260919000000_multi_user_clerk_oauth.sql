-- Expand the private vault from one configured owner to one isolated vault per
-- authenticated Clerk user. Existing owner IDs and recipe rows are unchanged.

begin;

drop policy if exists "private Clerk owner can select recipes" on public.recipes;
drop policy if exists "private Clerk owner can insert recipes" on public.recipes;
drop policy if exists "private Clerk owner can update recipes" on public.recipes;
drop policy if exists "private Clerk owner can delete recipes" on public.recipes;
drop policy if exists "private Clerk owner can select ingredients" on public.recipe_ingredients;
drop policy if exists "private Clerk owner can insert ingredients" on public.recipe_ingredients;
drop policy if exists "private Clerk owner can update ingredients" on public.recipe_ingredients;
drop policy if exists "private Clerk owner can delete ingredients" on public.recipe_ingredients;
drop policy if exists "private Clerk owner can select steps" on public.recipe_steps;
drop policy if exists "private Clerk owner can insert steps" on public.recipe_steps;
drop policy if exists "private Clerk owner can update steps" on public.recipe_steps;
drop policy if exists "private Clerk owner can delete steps" on public.recipe_steps;
drop policy if exists "private Clerk owner can select audit events" on public.recipe_audit_events;

create policy "Clerk users can select owned recipes"
on public.recipes for select to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "Clerk users can insert owned recipes"
on public.recipes for insert to authenticated
with check (owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "Clerk users can update owned recipes"
on public.recipes for update to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()))
with check (owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "Clerk users can delete owned recipes"
on public.recipes for delete to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()));

create policy "Clerk users can select owned ingredients"
on public.recipe_ingredients for select to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));
create policy "Clerk users can insert owned ingredients"
on public.recipe_ingredients for insert to authenticated
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));
create policy "Clerk users can update owned ingredients"
on public.recipe_ingredients for update to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));
create policy "Clerk users can delete owned ingredients"
on public.recipe_ingredients for delete to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));

create policy "Clerk users can select owned steps"
on public.recipe_steps for select to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));
create policy "Clerk users can insert owned steps"
on public.recipe_steps for insert to authenticated
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));
create policy "Clerk users can update owned steps"
on public.recipe_steps for update to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
))
with check (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));
create policy "Clerk users can delete owned steps"
on public.recipe_steps for delete to authenticated
using (exists (
  select 1 from public.recipes
  where recipes.id = recipe_id
    and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id())
));

create policy "Clerk users can select owned audit events"
on public.recipe_audit_events for select to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()));

create or replace function public.recipe_vault_record_audit_event(
  target_recipe_id uuid,
  target_owner_id text,
  audit_event_type text,
  audit_event_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id text := public.recipe_vault_current_clerk_user_id();
  is_service boolean := (select auth.role()) = 'service_role';
begin
  if not is_service and (caller_id is null or caller_id <> target_owner_id) then
    raise exception 'not authorized';
  end if;
  if audit_event_type !~ '^[a-z][a-z0-9_.-]{0,99}$'
    or jsonb_typeof(audit_event_data) <> 'object' then
    raise exception 'invalid audit event';
  end if;
  if not exists (
    select 1 from public.recipes
    where id = target_recipe_id and owner_id = target_owner_id
  ) then
    raise exception 'not authorized';
  end if;

  insert into public.recipe_audit_events (owner_id, recipe_id, actor_id, event_type, event_data)
  values (target_owner_id, target_recipe_id, coalesce(caller_id, target_owner_id), audit_event_type, audit_event_data);
end;
$$;

drop function public.recipe_vault_is_private_owner();
drop table public.recipe_vault_private_owners;

commit;
