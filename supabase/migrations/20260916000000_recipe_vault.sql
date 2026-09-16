-- Iteration 1: private recipe vault data model.
-- This migration intentionally contains no Auth provider or owner allow-list policy.

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create function public.recipe_vault_valid_labels(labels text[])
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select not exists (
    select 1
    from unnest(labels) as label
    where label is null
      or label <> btrim(label)
      or char_length(label) not between 1 and 64
      or label !~ '^[a-z0-9][a-z0-9 _-]*$'
  );
$$;

create function public.recipe_vault_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  summary text check (summary is null or char_length(btrim(summary)) between 1 and 2_000),
  prep_time_minutes integer check (prep_time_minutes is null or prep_time_minutes >= 0),
  cook_time_minutes integer check (cook_time_minutes is null or cook_time_minutes >= 0),
  total_time_minutes integer check (total_time_minutes is null or total_time_minutes >= 0),
  servings integer check (servings is null or servings > 0),
  tags text[] not null default '{}'::text[] check (public.recipe_vault_valid_labels(tags)),
  dietary_flags text[] not null default '{}'::text[] check (public.recipe_vault_valid_labels(dietary_flags)),
  source_url text check (source_url is null or source_url ~* '^https?://[^[:space:]]+$'),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 10_000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    total_time_minutes is null
    or prep_time_minutes is null
    or cook_time_minutes is null
    or total_time_minutes >= prep_time_minutes + cook_time_minutes
  )
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  display_order integer not null check (display_order > 0),
  quantity numeric(12, 3) not null check (quantity >= 0),
  unit text not null check (char_length(btrim(unit)) between 1 and 32),
  ingredient_name text not null check (char_length(btrim(ingredient_name)) between 1 and 200),
  notes text check (notes is null or char_length(btrim(notes)) between 1 and 1_000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, display_order)
);

create table public.recipe_steps (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  step_order integer not null check (step_order > 0),
  instruction text not null check (char_length(btrim(instruction)) between 1 and 5_000),
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipe_id, step_order)
);

create table public.recipe_audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type ~ '^[a-z][a-z0-9_.-]{0,99}$'),
  event_data jsonb not null default '{}'::jsonb check (jsonb_typeof(event_data) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index recipes_owner_updated_at_idx on public.recipes (owner_id, updated_at desc, id desc);
create index recipes_title_trgm_idx on public.recipes using gin (title gin_trgm_ops);
create index recipe_ingredients_recipe_order_idx on public.recipe_ingredients (recipe_id, display_order);
create index recipe_steps_recipe_order_idx on public.recipe_steps (recipe_id, step_order);
create index recipe_audit_events_owner_created_at_idx on public.recipe_audit_events (owner_id, created_at desc, id desc);
create index recipe_audit_events_recipe_created_at_idx on public.recipe_audit_events (recipe_id, created_at desc, id desc);

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.recipe_vault_set_updated_at();

create trigger recipe_ingredients_set_updated_at
before update on public.recipe_ingredients
for each row execute function public.recipe_vault_set_updated_at();

create trigger recipe_steps_set_updated_at
before update on public.recipe_steps
for each row execute function public.recipe_vault_set_updated_at();

alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.recipe_audit_events enable row level security;

grant select, insert, update, delete on public.recipes to authenticated;
grant select, insert, update, delete on public.recipe_ingredients to authenticated;
grant select, insert, update, delete on public.recipe_steps to authenticated;
grant select on public.recipe_audit_events to authenticated;
revoke all on public.recipes, public.recipe_ingredients, public.recipe_steps, public.recipe_audit_events from anon, public;

create policy "recipe owners can select recipes"
on public.recipes for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "recipe owners can insert recipes"
on public.recipes for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "recipe owners can update recipes"
on public.recipes for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "recipe owners can delete recipes"
on public.recipes for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "recipe owners can select ingredients"
on public.recipe_ingredients for select to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can insert ingredients"
on public.recipe_ingredients for insert to authenticated
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can update ingredients"
on public.recipe_ingredients for update to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())))
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can delete ingredients"
on public.recipe_ingredients for delete to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can select steps"
on public.recipe_steps for select to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can insert steps"
on public.recipe_steps for insert to authenticated
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can update steps"
on public.recipe_steps for update to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())))
with check (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can delete steps"
on public.recipe_steps for delete to authenticated
using (exists (select 1 from public.recipes where recipes.id = recipe_id and recipes.owner_id = (select auth.uid())));

create policy "recipe owners can select audit events"
on public.recipe_audit_events for select to authenticated
using ((select auth.uid()) = owner_id);

-- There are deliberately no INSERT, UPDATE, or DELETE policies for audit events.
-- Future trusted server-side code can append records with a service role or a narrowly
-- scoped database function; an end-user JWT can only read its own history.
