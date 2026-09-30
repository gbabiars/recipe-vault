-- Run after migrations against a disposable local database. Fixtures roll back.
begin;

insert into public.recipes (owner_id, title, notes, tags)
values
  ('tag_merge_owner', 'Merge both tags', 'keep both fields', array['source', 'target', 'keep']),
  ('tag_merge_owner', 'Merge source only', 'keep this field', array['source', 'other']),
  ('tag_merge_owner', 'Merge target only', 'keep that field', array['target']),
  ('tag_merge_owner', 'Merge into empty target', null, array['source_to_empty']),
  ('tag_merge_other', 'Other owner source', null, array['source']);
insert into public.tags (owner_id, name)
values
  ('tag_merge_owner', 'unused_source'),
  ('tag_merge_owner', 'unused_target'),
  ('tag_merge_owner', 'empty_target');
insert into public.recipe_ingredients (
  recipe_id, display_order, amount, ingredient_name
)
select id, 1, '1 cup', 'preserved ingredient'
from public.recipes
where owner_id = 'tag_merge_owner' and title = 'Merge both tags';

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $verify$
declare
  source_id uuid;
  target_id uuid;
  other_source_id uuid;
  unused_source_id uuid;
  unused_target_id uuid;
  source_to_empty_id uuid;
  empty_target_id uuid;
  merge_succeeded boolean;
  projected_tags text[];
  target_link_count integer;
  missing_id uuid := '00000000-0000-4000-8000-000000000099';
  both_recipe_id uuid;
  source_recipe_id uuid;
  empty_target_recipe_id uuid;
begin
  select id into source_id from public.tags where owner_id = 'tag_merge_owner' and name = 'source';
  select id into target_id from public.tags where owner_id = 'tag_merge_owner' and name = 'target';
  select id into other_source_id from public.tags where owner_id = 'tag_merge_other' and name = 'source';
  select id into unused_source_id from public.tags where owner_id = 'tag_merge_owner' and name = 'unused_source';
  select id into unused_target_id from public.tags where owner_id = 'tag_merge_owner' and name = 'unused_target';
  select id into source_to_empty_id from public.tags where owner_id = 'tag_merge_owner' and name = 'source_to_empty';
  select id into empty_target_id from public.tags where owner_id = 'tag_merge_owner' and name = 'empty_target';
  select id into both_recipe_id from public.recipes where owner_id = 'tag_merge_owner' and title = 'Merge both tags';
  select id into source_recipe_id from public.recipes where owner_id = 'tag_merge_owner' and title = 'Merge source only';
  select id into empty_target_recipe_id from public.recipes where owner_id = 'tag_merge_owner' and title = 'Merge into empty target';

  if public.recipe_vault_merge_tags('tag_merge_owner', source_id, source_id) then
    raise exception 'same source and target IDs should not merge';
  end if;
  if public.recipe_vault_merge_tags('tag_merge_owner', missing_id, target_id) then
    raise exception 'a missing source ID should not merge';
  end if;
  if public.recipe_vault_merge_tags('tag_merge_owner', other_source_id, target_id) then
    raise exception 'another owner''s source ID should not merge';
  end if;
  if public.recipe_vault_merge_tags('tag_merge_owner', null, target_id) then
    raise exception 'a null source ID should not merge';
  end if;
  if not exists (select 1 from public.tags where id = other_source_id and owner_id = 'tag_merge_other') then
    raise exception 'a failed cross-owner merge changed the other owner''s tag';
  end if;

  if not public.recipe_vault_merge_tags('tag_merge_owner', source_id, target_id) then
    raise exception 'two owned tags could not be merged';
  end if;
  if exists (select 1 from public.tags where owner_id = 'tag_merge_owner' and id = source_id)
    or not exists (select 1 from public.tags where owner_id = 'tag_merge_owner' and id = target_id) then
    raise exception 'merge did not remove the source and preserve the target';
  end if;
  if exists (select 1 from public.recipe_tags where owner_id = 'tag_merge_owner' and tag_id = source_id)
    or (select count(*) from public.recipe_tags where owner_id = 'tag_merge_owner' and tag_id = target_id) <> 3 then
    raise exception 'source associations were lost or not consolidated onto the target';
  end if;
  if (select tags from public.recipes where id = both_recipe_id) <> array['keep', 'target']
    or (select tags from public.recipes where id = source_recipe_id) <> array['other', 'target'] then
    raise exception 'the compatibility projection did not deduplicate and transfer source tags';
  end if;
  if (select title from public.recipes where id = both_recipe_id) <> 'Merge both tags'
    or (select notes from public.recipes where id = both_recipe_id) <> 'keep both fields'
    or (select ingredient_name from public.recipe_ingredients where recipe_id = both_recipe_id) <> 'preserved ingredient'
    or (select amount from public.recipe_ingredients where recipe_id = both_recipe_id) <> '1 cup' then
    raise exception 'merge changed recipe or ingredient data beyond the tag projection';
  end if;

  -- A source tag with no recipe usage can still be merged into an unused target.
  merge_succeeded := public.recipe_vault_merge_tags(
    'tag_merge_owner', unused_source_id, unused_target_id
  );
  if not merge_succeeded then
    raise exception 'unused tag merge returned false for source %, target %', unused_source_id, unused_target_id;
  end if;
  if exists (select 1 from public.tags where id = unused_source_id) then
    raise exception 'unused tag merge retained source %', unused_source_id;
  end if;
  if not exists (select 1 from public.tags where id = unused_target_id) then
    raise exception 'unused tag merge removed target %', unused_target_id;
  end if;

  -- A used source can be consolidated into a target that had no usage.
  merge_succeeded := public.recipe_vault_merge_tags(
    'tag_merge_owner', source_to_empty_id, empty_target_id
  );
  if not merge_succeeded then
    raise exception 'used-source merge returned false for source %, target %', source_to_empty_id, empty_target_id;
  end if;
  select tags into projected_tags from public.recipes where id = empty_target_recipe_id;
  select count(*) into target_link_count from public.recipe_tags
  where recipe_id = empty_target_recipe_id and tag_id = empty_target_id;
  if projected_tags <> array['empty_target'] then
    raise exception 'used-source projection was %, expected {empty_target}', projected_tags;
  end if;
  if target_link_count <> 1 then
    raise exception 'used-source target association count was %, expected 1', target_link_count;
  end if;
end;
$verify$;

reset role;
set local role anon;
do $verify$
begin
  begin
    perform public.recipe_vault_merge_tags(
      'tag_merge_owner', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'
    );
    raise exception 'anon could execute the service-role merge RPC';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

reset role;
set local role authenticated;
do $verify$
begin
  begin
    perform public.recipe_vault_merge_tags(
      'tag_merge_owner', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'
    );
    raise exception 'authenticated could execute the service-role merge RPC';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

rollback;
