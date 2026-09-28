-- Run after migrations against a disposable local database. Fixtures roll back.
begin;

insert into public.recipes (owner_id, title, tags)
values
  ('tag_cleanup_owner', 'Tag cleanup used recipe', array['dinner']),
  ('tag_cleanup_other', 'Other owner cleanup recipe', array['other_tag']);
insert into public.tags (owner_id, name)
values ('tag_cleanup_owner', 'unused');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
do $verify$
declare
  owner_unused_id uuid;
  owner_used_id uuid;
  other_owner_id uuid;
  missing_id uuid := '00000000-0000-4000-8000-000000000099';
begin
  select id into owner_unused_id from public.tags
    where owner_id = 'tag_cleanup_owner' and name = 'unused';
  select id into owner_used_id from public.tags
    where owner_id = 'tag_cleanup_owner' and name = 'dinner';
  select id into other_owner_id from public.tags
    where owner_id = 'tag_cleanup_other' and name = 'other_tag';

  if public.recipe_vault_delete_unused_tag('tag_cleanup_owner', owner_used_id) then
    raise exception 'a used tag was deleted';
  end if;
  if not exists (select 1 from public.tags where id = owner_used_id)
    or not exists (select 1 from public.recipe_tags where tag_id = owner_used_id)
    or not exists (select 1 from public.recipes where owner_id = 'tag_cleanup_owner' and tags @> array['dinner']) then
    raise exception 'a used tag, association, or compatibility projection was changed';
  end if;

  if public.recipe_vault_delete_unused_tag('tag_cleanup_owner', other_owner_id) then
    raise exception 'another owner''s tag was deleted';
  end if;
  if public.recipe_vault_delete_unused_tag('tag_cleanup_owner', missing_id) then
    raise exception 'a missing tag was reported as deleted';
  end if;

  if not public.recipe_vault_delete_unused_tag('tag_cleanup_owner', owner_unused_id) then
    raise exception 'an unused owned tag was not deleted';
  end if;
  if exists (select 1 from public.tags where id = owner_unused_id) then
    raise exception 'the unused tag still exists after successful deletion';
  end if;
  if public.recipe_vault_delete_unused_tag('tag_cleanup_owner', owner_unused_id) then
    raise exception 'a repeated deletion did not return the same not-found result';
  end if;
end;
$verify$;

reset role;
set local role anon;
do $verify$
begin
  begin
    perform public.recipe_vault_delete_unused_tag(
      'tag_cleanup_owner', '00000000-0000-4000-8000-000000000001'
    );
    raise exception 'anon could execute the service-role tag delete RPC';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

reset role;
set local role authenticated;
do $verify$
begin
  begin
    perform public.recipe_vault_delete_unused_tag(
      'tag_cleanup_owner', '00000000-0000-4000-8000-000000000001'
    );
    raise exception 'authenticated could execute the service-role tag delete RPC';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;

rollback;
