-- Migrate ownership from Supabase Auth UUIDs to Clerk's string user IDs.
-- Existing UUID values are retained as text; map them to Clerk IDs manually
-- before enabling browser traffic (see docs/clerk-migration-checklist.md).

begin;

drop function if exists public.recipe_vault_record_audit_event(uuid, uuid, text, jsonb);

-- PostgreSQL does not permit changing a column's type while an RLS policy
-- references it, so remove the UUID-based policies before converting owner IDs.
drop policy if exists "recipe owners can select recipes" on public.recipes;
drop policy if exists "recipe owners can insert recipes" on public.recipes;
drop policy if exists "recipe owners can update recipes" on public.recipes;
drop policy if exists "recipe owners can delete recipes" on public.recipes;
drop policy if exists "recipe owners can select ingredients" on public.recipe_ingredients;
drop policy if exists "recipe owners can insert ingredients" on public.recipe_ingredients;
drop policy if exists "recipe owners can update ingredients" on public.recipe_ingredients;
drop policy if exists "recipe owners can delete ingredients" on public.recipe_ingredients;
drop policy if exists "recipe owners can select steps" on public.recipe_steps;
drop policy if exists "recipe owners can insert steps" on public.recipe_steps;
drop policy if exists "recipe owners can update steps" on public.recipe_steps;
drop policy if exists "recipe owners can delete steps" on public.recipe_steps;
drop policy if exists "recipe owners can select audit events" on public.recipe_audit_events;

alter table public.recipes drop constraint if exists recipes_owner_id_fkey;
alter table public.recipe_audit_events drop constraint if exists recipe_audit_events_owner_id_fkey;
alter table public.recipe_audit_events drop constraint if exists recipe_audit_events_actor_id_fkey;

alter table public.recipes
  alter column owner_id type text using owner_id::text;
alter table public.recipe_audit_events
  alter column owner_id type text using owner_id::text,
  alter column actor_id type text using actor_id::text;

-- This table has no client permissions. An operator adds the one Clerk owner in
-- the SQL editor, so RLS remains private even if another Clerk account signs in.
create table public.recipe_vault_private_owners (
  user_id text primary key check (char_length(btrim(user_id)) between 1 and 255),
  created_at timestamptz not null default timezone('utc', now())
);
alter table public.recipe_vault_private_owners enable row level security;
revoke all on public.recipe_vault_private_owners from anon, authenticated, public;

create function public.recipe_vault_current_clerk_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif((select auth.jwt() ->> 'sub'), '');
$$;

create function public.recipe_vault_is_private_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.recipe_vault_private_owners
    where user_id = public.recipe_vault_current_clerk_user_id()
  );
$$;

revoke all on function public.recipe_vault_current_clerk_user_id() from public;
revoke all on function public.recipe_vault_is_private_owner() from public;
grant execute on function public.recipe_vault_current_clerk_user_id() to authenticated;
grant execute on function public.recipe_vault_is_private_owner() to authenticated;

create policy "private Clerk owner can select recipes"
on public.recipes for select to authenticated
using ((select public.recipe_vault_is_private_owner()) and owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "private Clerk owner can insert recipes"
on public.recipes for insert to authenticated
with check ((select public.recipe_vault_is_private_owner()) and owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "private Clerk owner can update recipes"
on public.recipes for update to authenticated
using ((select public.recipe_vault_is_private_owner()) and owner_id = (select public.recipe_vault_current_clerk_user_id()))
with check ((select public.recipe_vault_is_private_owner()) and owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "private Clerk owner can delete recipes"
on public.recipes for delete to authenticated
using ((select public.recipe_vault_is_private_owner()) and owner_id = (select public.recipe_vault_current_clerk_user_id()));

create policy "private Clerk owner can select ingredients"
on public.recipe_ingredients for select to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));
create policy "private Clerk owner can insert ingredients"
on public.recipe_ingredients for insert to authenticated
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));
create policy "private Clerk owner can update ingredients"
on public.recipe_ingredients for update to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())))
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));
create policy "private Clerk owner can delete ingredients"
on public.recipe_ingredients for delete to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));

create policy "private Clerk owner can select steps"
on public.recipe_steps for select to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));
create policy "private Clerk owner can insert steps"
on public.recipe_steps for insert to authenticated
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));
create policy "private Clerk owner can update steps"
on public.recipe_steps for update to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())))
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));
create policy "private Clerk owner can delete steps"
on public.recipe_steps for delete to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select public.recipe_vault_current_clerk_user_id()) and (select public.recipe_vault_is_private_owner())));

create policy "private Clerk owner can select audit events"
on public.recipe_audit_events for select to authenticated
using ((select public.recipe_vault_is_private_owner()) and owner_id = (select public.recipe_vault_current_clerk_user_id()));

create function public.recipe_vault_record_audit_event(
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
  if not is_service and (
    caller_id is null
    or caller_id <> target_owner_id
    or not public.recipe_vault_is_private_owner()
  ) then
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

revoke all on function public.recipe_vault_record_audit_event(uuid, text, text, jsonb) from public;
grant execute on function public.recipe_vault_record_audit_event(uuid, text, text, jsonb) to authenticated, service_role;

commit;
