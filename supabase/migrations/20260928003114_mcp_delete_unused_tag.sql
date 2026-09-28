-- Safely delete one owned tag only when it has no recipe associations.
-- The MCP service_role bypasses RLS, so every data query is explicitly owner-scoped.
create function public.recipe_vault_delete_unused_tag(
  target_owner_id text,
  target_tag_id uuid
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if target_owner_id is null
    or char_length(btrim(target_owner_id)) not between 1 and 255 then
    raise exception 'invalid owner';
  end if;

  -- A recipe_tags foreign key check takes KEY SHARE on the referenced tag.
  -- FOR UPDATE conflicts with that lock, serializing this check against any
  -- in-flight association insert. Under READ COMMITTED, the following query
  -- sees a transaction that committed while this row lock was being acquired.
  perform 1
  from public.tags as tag
  where tag.id = target_tag_id
    and tag.owner_id = target_owner_id
  for update;
  if not found then
    return false;
  end if;

  if exists (
    select 1
    from public.recipe_tags as link
    where link.owner_id = target_owner_id
      and link.tag_id = target_tag_id
  ) then
    return false;
  end if;

  delete from public.tags as tag
  where tag.id = target_tag_id
    and tag.owner_id = target_owner_id
    and not exists (
      select 1
      from public.recipe_tags as link
      where link.owner_id = target_owner_id
        and link.tag_id = target_tag_id
    );
  return found;
end;
$$;

revoke all on function public.recipe_vault_delete_unused_tag(text, uuid)
  from public, anon, authenticated;
grant execute on function public.recipe_vault_delete_unused_tag(text, uuid)
  to service_role;
