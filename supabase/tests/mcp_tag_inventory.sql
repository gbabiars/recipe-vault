-- Run after migrations against a disposable local database. Fixtures roll back.
begin;

insert into public.recipes (owner_id, title, tags)
values
  ('tag_inventory_owner', 'Tag inventory recipe one', array['dinner', 'meal_kit']),
  ('tag_inventory_owner', 'Tag inventory recipe two', array['dinner', 'supper']),
  ('tag_inventory_owner', 'Tag inventory recipe three', array['dinner']),
  ('tag_inventory_other', 'Other owner inventory recipe', array['dinner']);
insert into public.tags (owner_id, name)
values ('tag_inventory_owner', 'unused');

do $verify$
declare
  cursor_row record;
  first_page text[];
  second_page text[];
  all_names text[];
begin
  select array_agg(name order by name collate "C", id) into all_names
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'name_asc', null, null, null, 100
  );
  if all_names <> array['dinner', 'meal_kit', 'supper', 'unused'] then
    raise exception 'owner-scoped alphabetic inventory was incorrect: %', all_names;
  end if;
  if (select usage_count from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', 'DIN', 'all', 'name_asc', null, null, null, 10
    ) where name = 'dinner') <> 3 then
    raise exception 'tag usage count was not the exact distinct recipe count';
  end if;
  if (select count(*) from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', null, 'used', 'name_asc', null, null, null, 10
    )) <> 3 then
    raise exception 'used tag filter returned the wrong rows';
  end if;
  if (select count(*) from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', null, 'unused', 'name_asc', null, null, null, 10
    )) <> 1
    or not exists (select 1 from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', null, 'unused', 'name_asc', null, null, null, 10
    ) where name = 'unused' and usage_count = 0) then
    raise exception 'unused tags did not include a zero-count tag';
  end if;
  if exists (select 1 from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', '%', 'all', 'name_asc', null, null, null, 10
    )) then
    raise exception 'percent search was treated as a wildcard';
  end if;
  if (select array_agg(name order by name collate "C", id)
      from public.recipe_vault_list_tag_inventory(
        'tag_inventory_owner', '_', 'all', 'name_asc', null, null, null, 10
      )) <> array['meal_kit'] then
    raise exception 'underscore search was treated as a wildcard';
  end if;
  if (select array_agg(name order by usage_count desc, name collate "C", id)
      from public.recipe_vault_list_tag_inventory(
        'tag_inventory_owner', null, 'all', 'usage_desc', null, null, null, 10
      )) <> array['dinner', 'meal_kit', 'supper', 'unused'] then
    raise exception 'usage descending order or deterministic tie-break was incorrect';
  end if;
  if (select array_agg(name order by usage_count, name collate "C", id)
      from public.recipe_vault_list_tag_inventory(
        'tag_inventory_owner', null, 'all', 'usage_asc', null, null, null, 10
      )) <> array['unused', 'meal_kit', 'supper', 'dinner'] then
    raise exception 'usage ascending order or deterministic tie-break was incorrect';
  end if;

  select array_agg(name order by name collate "C", id) into first_page
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'name_asc', null, null, null, 2
  );
  select usage_count, name, id into cursor_row
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'name_asc', null, null, null, 2
  )
  order by name collate "C", id offset 1 limit 1;
  select array_agg(name order by name collate "C", id) into second_page
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'name_asc',
    cursor_row.usage_count, cursor_row.name, cursor_row.id, 2
  );
  if first_page <> array['dinner', 'meal_kit']
    or second_page <> array['supper', 'unused'] then
    raise exception 'name keyset pagination skipped or duplicated rows: %, %', first_page, second_page;
  end if;

  select usage_count, name, id into cursor_row
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'usage_desc', null, null, null, 2
  )
  order by usage_count desc, name collate "C", id offset 1 limit 1;
  select array_agg(name order by usage_count desc, name collate "C", id) into second_page
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'usage_desc',
    cursor_row.usage_count, cursor_row.name, cursor_row.id, 2
  );
  if second_page <> array['supper', 'unused'] then
    raise exception 'usage descending keyset pagination skipped or duplicated rows: %', second_page;
  end if;

  select usage_count, name, id into cursor_row
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'usage_asc', null, null, null, 2
  )
  order by usage_count, name collate "C", id offset 1 limit 1;
  select array_agg(name order by usage_count, name collate "C", id) into second_page
  from public.recipe_vault_list_tag_inventory(
    'tag_inventory_owner', null, 'all', 'usage_asc',
    cursor_row.usage_count, cursor_row.name, cursor_row.id, 2
  );
  if second_page <> array['supper', 'dinner'] then
    raise exception 'usage ascending keyset pagination skipped or duplicated rows: %', second_page;
  end if;

  if exists (select 1 from public.recipe_vault_list_tag_inventory(
      'tag_inventory_other', null, 'all', 'name_asc', null, null, null, 10
    ) where name <> 'dinner')
    or (select usage_count from public.recipe_vault_list_tag_inventory(
      'tag_inventory_other', null, 'all', 'name_asc', null, null, null, 10
    ) where name = 'dinner') <> 1 then
    raise exception 'another owner''s tag catalog or recipe usage leaked into the result';
  end if;
end;
$verify$;

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $verify$
begin
  if (select count(*) from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', null, 'all', 'name_asc', null, null, null, 10
    )) <> 4 then
    raise exception 'service_role could not execute the inventory RPC';
  end if;
end;
$verify$;

reset role;
set local role anon;
do $verify$
begin
  begin
    perform * from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', null, 'all', 'name_asc', null, null, null, 10
    );
    raise exception 'anon could execute the inventory RPC';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

reset role;
set local role authenticated;
do $verify$
begin
  begin
    perform * from public.recipe_vault_list_tag_inventory(
      'tag_inventory_owner', null, 'all', 'name_asc', null, null, null, 10
    );
    raise exception 'authenticated could execute the service-role inventory RPC';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

rollback;
