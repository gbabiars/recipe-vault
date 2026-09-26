-- Stable, owner-scoped tags. The recipe array remains a compatibility projection.
-- Canonical names are lowercase ASCII, trimmed, with runs of ASCII spaces reduced
-- to one space. Similar spellings are intentionally distinct.
create function public.recipe_vault_canonical_tag_name(value text)
returns text language sql immutable parallel safe set search_path = ''
as $$ select lower(regexp_replace(btrim(value, E' \t\n\r\f\v'), ' +', ' ', 'g')); $$;

create function public.recipe_vault_canonical_tags(input_labels text[])
returns text[] language sql immutable parallel safe set search_path = ''
as $$
  select coalesce(array_agg(name order by first_position), '{}'::text[])
  from (
    select public.recipe_vault_canonical_tag_name(value) as name, min(position) as first_position
    from unnest(input_labels) with ordinality as item(value, position)
    group by 1
  ) normalized;
$$;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null check (char_length(btrim(owner_id)) between 1 and 255),
  name text not null check (
    name = public.recipe_vault_canonical_tag_name(name)
    and public.recipe_vault_valid_labels(array[name])
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, name),
  unique (owner_id, id)
);

alter table public.recipes add constraint recipes_owner_id_id_unique unique (owner_id, id);

create table public.recipe_tags (
  owner_id text not null,
  recipe_id uuid not null,
  tag_id uuid not null,
  primary key (recipe_id, tag_id),
  foreign key (owner_id, recipe_id) references public.recipes(owner_id, id) on delete cascade,
  foreign key (owner_id, tag_id) references public.tags(owner_id, id) on delete cascade
);
create index recipe_tags_owner_tag_recipe_idx on public.recipe_tags (owner_id, tag_id, recipe_id);

alter table public.tags enable row level security;
alter table public.recipe_tags enable row level security;
revoke all on public.tags, public.recipe_tags from anon, public;
grant select, insert, update, delete on public.tags to authenticated;
grant select on public.recipe_tags to authenticated;
-- Direct association mutation is reserved for the recipe compatibility trigger.
create policy "owners read tags" on public.tags for select to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "owners insert tags" on public.tags for insert to authenticated
with check (owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "owners update tags" on public.tags for update to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()))
with check (owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "owners delete tags" on public.tags for delete to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()));
create policy "owners read recipe tags" on public.recipe_tags for select to authenticated
using (owner_id = (select public.recipe_vault_current_clerk_user_id()));

create trigger tags_set_updated_at before update on public.tags
for each row execute function public.recipe_vault_set_updated_at();

-- Trigger code is privileged only to maintain the projection and associations.
-- Recipes are already guarded by their own RLS; composite FKs guard owner matches.
create function public.recipe_vault_prepare_recipe_tags()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.tags := public.recipe_vault_canonical_tags(new.tags);
  return new;
end;
$$;
create trigger recipes_prepare_tags before insert or update of tags on public.recipes
for each row execute function public.recipe_vault_prepare_recipe_tags();

create function public.recipe_vault_sync_recipe_tags()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.tags (owner_id, name)
  select new.owner_id, name from unnest(new.tags) as name
  on conflict (owner_id, name) do nothing;

  delete from public.recipe_tags where recipe_id = new.id;
  insert into public.recipe_tags (owner_id, recipe_id, tag_id)
  select new.owner_id, new.id, tag.id
  from public.tags tag where tag.owner_id = new.owner_id and tag.name = any(new.tags);
  return null;
end;
$$;
create trigger recipes_sync_tags after insert or update of tags on public.recipes
for each row when (pg_trigger_depth() = 0)
execute function public.recipe_vault_sync_recipe_tags();

create function public.recipe_vault_refresh_recipe_tag_names(target_recipe_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.recipes recipe set tags = coalesce((
    select array_agg(tag.name order by tag.name)
    from public.recipe_tags link join public.tags tag on tag.id = link.tag_id
    where link.recipe_id = target_recipe_id
  ), '{}'::text[])
  where recipe.id = target_recipe_id;
end;
$$;

create function public.recipe_vault_recipe_tags_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' or tg_op = 'UPDATE' then
    perform public.recipe_vault_refresh_recipe_tag_names(old.recipe_id);
  end if;
  if tg_op = 'INSERT' or tg_op = 'UPDATE' then
    if tg_op <> 'UPDATE' or new.recipe_id is distinct from old.recipe_id then
      perform public.recipe_vault_refresh_recipe_tag_names(new.recipe_id);
    end if;
  end if;
  return null;
end;
$$;
create trigger recipe_tags_refresh_recipe after insert or update or delete on public.recipe_tags
for each row when (pg_trigger_depth() = 0)
execute function public.recipe_vault_recipe_tags_changed();

create function public.recipe_vault_tag_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  if tg_op = 'DELETE' then
    for target in select recipe_id from public.recipe_tags where tag_id = old.id loop
      delete from public.recipe_tags where recipe_id = target and tag_id = old.id;
      perform public.recipe_vault_refresh_recipe_tag_names(target);
    end loop;
    return old;
  end if;
  if new.name is distinct from old.name then
    for target in select recipe_id from public.recipe_tags where tag_id = new.id loop
      perform public.recipe_vault_refresh_recipe_tag_names(target);
    end loop;
  end if;
  return new;
end;
$$;
create trigger tags_renamed after update of name on public.tags
for each row execute function public.recipe_vault_tag_changed();
create trigger tags_deleting before delete on public.tags
for each row execute function public.recipe_vault_tag_changed();

-- Backfill through the same compatibility trigger used for legacy writes.
-- Every existing array entry gets its canonical tag and recipe association.
update public.recipes set tags = public.recipe_vault_canonical_tags(tags);

-- A single RPC replaces the former multi-request recipe/ingredient/step write.
-- Any constraint failure rolls back the recipe, tags, associations and details.
create function public.recipe_vault_write_recipe(
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
      total_time_minutes, servings, tags, dietary_flags, source_url, notes
    ) values (
      target_owner_id, recipe_data->>'title', recipe_data->>'summary',
      (recipe_data->>'prep_time_minutes')::integer, (recipe_data->>'cook_time_minutes')::integer,
      (recipe_data->>'total_time_minutes')::integer, (recipe_data->>'servings')::integer,
      coalesce(array(select jsonb_array_elements_text(recipe_data->'tags')), '{}'::text[]),
      coalesce(array(select jsonb_array_elements_text(recipe_data->'dietary_flags')), '{}'::text[]),
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
      dietary_flags = coalesce(array(select jsonb_array_elements_text(recipe_data->'dietary_flags')), '{}'::text[]),
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
revoke all on function public.recipe_vault_write_recipe(text, uuid, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.recipe_vault_write_recipe(text, uuid, jsonb, jsonb, jsonb) to authenticated, service_role;
revoke all on function public.recipe_vault_prepare_recipe_tags() from public, anon, authenticated;
revoke all on function public.recipe_vault_sync_recipe_tags() from public, anon, authenticated;
revoke all on function public.recipe_vault_refresh_recipe_tag_names(uuid) from public, anon, authenticated;
revoke all on function public.recipe_vault_recipe_tags_changed() from public, anon, authenticated;
revoke all on function public.recipe_vault_tag_changed() from public, anon, authenticated;
