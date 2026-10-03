begin;

-- Add a reverse keyset cursor while keeping the original eight-argument call
-- shape available through the defaulted trailing parameters.
drop function public.recipe_vault_list_tag_inventory(
  text, text, text, text, bigint, text, uuid, integer
);

create function public.recipe_vault_list_tag_inventory(
  target_owner_id text,
  target_search text,
  target_usage text,
  target_sort text,
  after_usage_count bigint,
  after_name text,
  after_tag_id uuid,
  target_limit integer,
  before_usage_count bigint default null,
  before_name text default null,
  before_tag_id uuid default null
)
returns table (id uuid, name text, usage_count bigint, description text)
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
    or (after_name is null) <> (after_tag_id is null)
    or (before_usage_count is null) <> (before_name is null)
    or (before_name is null) <> (before_tag_id is null)
    or (after_name is not null and before_name is not null)
    or coalesce(after_usage_count < 0, false)
    or coalesce(before_usage_count < 0, false)
    or (after_name is not null and (after_name = '' or char_length(after_name) > 64))
    or (before_name is not null and (before_name = '' or char_length(before_name) > 64)) then
    raise exception 'invalid cursor';
  end if;

  if before_name is null then
    return query
    with inventory as (
      select
        tag.id,
        tag.name,
        count(distinct link.recipe_id)::bigint as usage_count,
        tag.description
      from public.tags as tag
      left join public.recipe_tags as link
        on link.owner_id = tag.owner_id and link.tag_id = tag.id
      where tag.owner_id = target_owner_id
        and (
          target_search is null
          or target_search = ''
          or strpos(lower(tag.name), lower(target_search)) > 0
        )
      group by tag.id, tag.name, tag.description
    )
    select inventory.id, inventory.name, inventory.usage_count, inventory.description
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
  else
    -- Select the nearest preceding rows in reverse order, then return the
    -- visible page in forward order with any lookahead row last.
    return query
    with inventory as (
      select
        tag.id,
        tag.name,
        count(distinct link.recipe_id)::bigint as usage_count,
        tag.description
      from public.tags as tag
      left join public.recipe_tags as link
        on link.owner_id = tag.owner_id and link.tag_id = tag.id
      where tag.owner_id = target_owner_id
        and (
          target_search is null
          or target_search = ''
          or strpos(lower(tag.name), lower(target_search)) > 0
        )
      group by tag.id, tag.name, tag.description
    ),
    page as (
      select
        inventory.*,
        row_number() over (
          order by
            case when target_sort = 'usage_asc' then inventory.usage_count end desc,
            case when target_sort = 'usage_desc' then inventory.usage_count end asc,
            inventory.name collate "C" desc,
            inventory.id desc
        ) as page_rank
      from inventory
      where (target_usage = 'all'
          or (target_usage = 'used' and inventory.usage_count > 0)
          or (target_usage = 'unused' and inventory.usage_count = 0))
        and (
          (target_sort = 'name_asc'
            and row(inventory.name collate "C", inventory.id) < row(before_name collate "C", before_tag_id))
          or (target_sort = 'usage_asc'
            and row(inventory.usage_count, inventory.name collate "C", inventory.id)
              < row(before_usage_count, before_name collate "C", before_tag_id))
          or (target_sort = 'usage_desc'
            and (
              inventory.usage_count > before_usage_count
              or (inventory.usage_count = before_usage_count
                and row(inventory.name collate "C", inventory.id) < row(before_name collate "C", before_tag_id))
            ))
        )
      order by
        case when target_sort = 'usage_asc' then inventory.usage_count end desc,
        case when target_sort = 'usage_desc' then inventory.usage_count end asc,
        inventory.name collate "C" desc,
        inventory.id desc
      limit target_limit
    )
    select page.id, page.name, page.usage_count, page.description
    from page
    order by
      case when page.page_rank = target_limit then 1 else 0 end asc,
      page.page_rank desc;
  end if;
end;
$$;

revoke all on function public.recipe_vault_list_tag_inventory(
  text, text, text, text, bigint, text, uuid, integer, bigint, text, uuid
) from public, anon, authenticated;
grant execute on function public.recipe_vault_list_tag_inventory(
  text, text, text, text, bigint, text, uuid, integer, bigint, text, uuid
) to authenticated, service_role;

commit;
