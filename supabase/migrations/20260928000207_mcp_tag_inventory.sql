-- Read-only owner-scoped tag inventory for the verified MCP adapter.
-- SECURITY INVOKER is intentional. MCP calls as service_role, which bypasses
-- RLS, so the explicit owner predicate below is required for every query.
create function public.recipe_vault_list_tag_inventory(
  target_owner_id text,
  target_search text,
  target_usage text,
  target_sort text,
  after_usage_count bigint,
  after_name text,
  after_tag_id uuid,
  target_limit integer
)
returns table (id uuid, name text, usage_count bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if target_owner_id is null or char_length(btrim(target_owner_id)) not between 1 and 255 then
    raise exception 'invalid owner';
  end if;
  if target_search is not null and char_length(target_search) > 200 then
    raise exception 'invalid search';
  end if;
  if target_usage is null or target_usage not in ('all', 'used', 'unused') then
    raise exception 'invalid usage filter';
  end if;
  if target_sort is null or target_sort not in ('name_asc', 'usage_desc', 'usage_asc') then
    raise exception 'invalid sort';
  end if;
  if target_limit is null or target_limit not between 1 and 101 then
    raise exception 'invalid limit';
  end if;
  if (after_usage_count is null) <> (after_name is null)
    or (after_name is null) <> (after_tag_id is null) then
    raise exception 'invalid cursor';
  end if;

  return query
  with inventory as (
    select
      tag.id,
      tag.name,
      count(distinct link.recipe_id)::bigint as usage_count
    from public.tags as tag
    left join public.recipe_tags as link
      on link.owner_id = tag.owner_id and link.tag_id = tag.id
    where tag.owner_id = target_owner_id
      and (
        target_search is null
        or target_search = ''
        or strpos(lower(tag.name), lower(target_search)) > 0
      )
    group by tag.id, tag.name
  )
  select inventory.id, inventory.name, inventory.usage_count
  from inventory
  where (target_usage = 'all'
      or (target_usage = 'used' and inventory.usage_count > 0)
      or (target_usage = 'unused' and inventory.usage_count = 0))
    and (
      after_name is null
      or (target_sort = 'name_asc'
        and row(inventory.name collate "C", inventory.id) > row(after_name collate "C", after_tag_id))
      or (target_sort = 'usage_asc'
        and row(inventory.usage_count, inventory.name collate "C", inventory.id)
          > row(after_usage_count, after_name collate "C", after_tag_id))
      or (target_sort = 'usage_desc'
        and (
          inventory.usage_count < after_usage_count
          or (inventory.usage_count = after_usage_count
            and row(inventory.name collate "C", inventory.id) > row(after_name collate "C", after_tag_id))
        ))
    )
  order by
    case when target_sort = 'usage_asc' then inventory.usage_count end asc,
    case when target_sort = 'usage_desc' then inventory.usage_count end desc,
    inventory.name collate "C" asc,
    inventory.id asc
  limit target_limit;
end;
$$;

revoke all on function public.recipe_vault_list_tag_inventory(
  text, text, text, text, bigint, text, uuid, integer
) from public, anon, authenticated;
grant execute on function public.recipe_vault_list_tag_inventory(
  text, text, text, text, bigint, text, uuid, integer
) to service_role;
