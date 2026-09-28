-- Merge two explicitly selected owned tags, preserving all recipe associations.
-- The MCP service_role bypasses RLS, so each database access is owner-scoped.
create function public.recipe_vault_merge_tags(
  target_owner_id text,
  source_tag_id uuid,
  target_tag_id uuid
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  locked_tag_id uuid;
  locked_count integer := 0;
begin
  if target_owner_id is null
    or char_length(btrim(target_owner_id)) not between 1 and 255 then
    raise exception 'invalid owner';
  end if;

  -- Same, missing, and unowned IDs share one result so this RPC cannot be used
  -- to enumerate another owner's tags.
  if source_tag_id is null or target_tag_id is null or source_tag_id = target_tag_id then
    return false;
  end if;

  -- Association FK checks take KEY SHARE on tags. Lock both rows in stable UUID
  -- order to wait for in-flight links and prevent new source/target links until
  -- this transaction has moved the source links and removed the source tag.
  -- The shared order also prevents two reverse-direction merges deadlocking.
  for locked_tag_id in
    select tag.id
    from public.tags as tag
    where tag.owner_id = target_owner_id
      and tag.id in (source_tag_id, target_tag_id)
    order by tag.id
    for update
  loop
    locked_count := locked_count + 1;
  end loop;
  if locked_count <> 2 then
    return false;
  end if;

  -- Remove duplicate source links where the recipe already has the target.
  -- The recipe_tags trigger refreshes that recipe's compatibility projection.
  delete from public.recipe_tags as source_link
  using public.recipe_tags as target_link
  where source_link.owner_id = target_owner_id
    and source_link.tag_id = source_tag_id
    and target_link.owner_id = target_owner_id
    and target_link.recipe_id = source_link.recipe_id
    and target_link.tag_id = target_tag_id;

  -- All remaining source links can now move to the target without conflicting
  -- with the (recipe_id, tag_id) primary key. Its existing trigger updates only
  -- the affected recipe's tag projection; ingredients and other recipe fields
  -- are untouched.
  update public.recipe_tags as source_link
  set tag_id = target_tag_id
  where source_link.owner_id = target_owner_id
    and source_link.tag_id = source_tag_id;

  delete from public.tags as source_tag
  where source_tag.owner_id = target_owner_id
    and source_tag.id = source_tag_id;
  return found;
end;
$$;

revoke all on function public.recipe_vault_merge_tags(text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.recipe_vault_merge_tags(text, uuid, uuid)
  to service_role;
