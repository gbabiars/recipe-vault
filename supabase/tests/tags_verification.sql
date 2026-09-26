-- Run against a disposable database after migrations. All fixtures roll back.
begin;

insert into public.recipes (owner_id, title, tags)
values ('user_tags_owner', 'Backfill fixture', array['  Dinner  ', 'dinner', 'Week  Night', 'week night', 'week-night']);

do $verify$
declare rid uuid; tid uuid; unused_id uuid; before_count integer;
begin
  select id into rid from public.recipes where title = 'Backfill fixture';
  if (select tags from public.recipes where id = rid) <> array['dinner', 'week night', 'week-night'] then
    raise exception 'canonical projection failed';
  end if;
  if (select count(*) from public.recipe_tags where recipe_id = rid) <> 3 then
    raise exception 'backfill lost associations or duplicated a canonical tag';
  end if;
  if (select count(*) from public.tags where owner_id = 'user_tags_owner' and name = 'dinner') <> 1 then
    raise exception 'exact duplicates did not resolve to one tag';
  end if;
  insert into public.tags (owner_id, name) values ('user_tags_other', 'other tag')
  returning id into tid;
  begin
    insert into public.recipe_tags (owner_id, recipe_id, tag_id)
    values ('user_tags_owner', rid, tid);
    raise exception 'cross-owner association succeeded';
  exception when foreign_key_violation then null;
  end;
  -- The unique constraint and ON CONFLICT in the trigger serialize concurrent
  -- inserts of the same owner/name; a losing transaction reuses the winner.
  if not exists (select 1 from pg_constraint where conname = 'tags_owner_id_name_key') then
    raise exception 'concurrent tag creation has no unique arbiter';
  end if;
  select tag_id into tid from public.recipe_tags link
    join public.tags tag on tag.id = link.tag_id
    where link.recipe_id = rid and tag.name = 'dinner';
  delete from public.recipe_tags where recipe_id = rid and tag_id = tid;
  if array_position((select tags from public.recipes where id = rid), 'dinner') is not null then
    raise exception 'association deletion did not refresh legacy array';
  end if;
  insert into public.recipe_tags (owner_id, recipe_id, tag_id)
  values ('user_tags_owner', rid, tid);
  if array_position((select tags from public.recipes where id = rid), 'dinner') is null then
    raise exception 'association insertion did not refresh legacy array';
  end if;
  update public.tags set name = 'supper' where id = tid;
  if not exists (select 1 from public.recipe_tags where recipe_id = rid and tag_id = tid)
    or array_position((select tags from public.recipes where id = rid), 'supper') is null then
    raise exception 'rename changed tag ID or lost association/projection';
  end if;
  begin
    update public.tags set name = 'week night' where id = tid;
    raise exception 'rename into an existing canonical name succeeded';
  exception when unique_violation then null;
  end;
  if (select name from public.tags where id = tid) <> 'supper'
    or not exists (select 1 from public.recipe_tags where recipe_id = rid and tag_id = tid) then
    raise exception 'conflicting rename changed tag or association';
  end if;
  delete from public.tags where id = tid;
  if not exists (select 1 from public.recipes where id = rid)
    or exists (select 1 from public.recipe_tags where recipe_id = rid and tag_id = tid)
    or array_position((select tags from public.recipes where id = rid), 'supper') is not null then
    raise exception 'tag deletion left association or deleted recipe';
  end if;
  insert into public.tags(owner_id, name) values ('user_tags_owner', 'unused')
  returning id into unused_id;
  if exists (select 1 from public.recipe_tags where tag_id = unused_id) then
    raise exception 'manual tag unexpectedly has recipe associations';
  end if;
  delete from public.tags where id = unused_id;
  if exists (select 1 from public.tags where id = unused_id) then
    raise exception 'unused tag deletion failed';
  end if;

  select count(*) into before_count from public.recipes;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  begin
    perform public.recipe_vault_write_recipe(
      'user_tags_owner', null,
      '{"title":"Failure fixture","tags":["new tag"],"dietary_flags":[]}'::jsonb,
      '[{"display_order":1,"quantity":1,"unit":"g","ingredient_name":"flour"}]'::jsonb,
      '[{"step_order":1,"instruction":"ok"},{"step_order":1,"instruction":"duplicate"}]'::jsonb
    );
    raise exception 'invalid write succeeded';
  exception when unique_violation then null;
  end;
  if (select count(*) from public.recipes) <> before_count
    or exists (select 1 from public.tags where name = 'new tag') then
    raise exception 'failed write left a partial recipe or tag';
  end if;
end;
$verify$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_tags_other","role":"authenticated"}', true);

do $verify$
begin
  if exists (select 1 from public.tags where owner_id = 'user_tags_owner')
    or exists (select 1 from public.recipe_tags where owner_id = 'user_tags_owner') then
    raise exception 'other owner can read tags';
  end if;
  begin
    insert into public.tags(owner_id, name) values ('user_tags_owner', 'intrusion');
    raise exception 'other owner could insert tag';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.recipe_vault_write_recipe(
      'user_tags_owner', null,
      '{"title":"Intrusion","tags":[],"dietary_flags":[]}'::jsonb,
      '[{"display_order":1,"quantity":1,"unit":"g","ingredient_name":"flour"}]'::jsonb,
      '[{"step_order":1,"instruction":"ok"}]'::jsonb
    );
    raise exception 'other owner could write recipe';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;
rollback;
