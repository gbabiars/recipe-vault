-- Replace the transitional recipe document with typed columns while preserving
-- the JSON document RPC contract used by the application.
begin;

create extension if not exists pg_jsonschema with schema extensions;

create temporary table recipe_column_storage_snapshot on commit drop as
select id, owner_id, created_at, updated_at, document, revision
from public.recipes;

create temporary table recipe_column_storage_audit_snapshot on commit drop as
select id, pg_catalog.to_jsonb(event) as row_data
from public.recipe_audit_events as event;

create function public.recipe_vault_valid_text_list(entries text[], minimum_items integer, maximum_length integer)
returns boolean
language sql immutable parallel safe set search_path = ''
as $function$
  select cardinality(entries) >= minimum_items
    and not exists (
      select 1 from unnest(entries) as item
      where item is null or char_length(item) not between 1 and maximum_length
        or item ~ '^[[:space:]]|[[:space:]]$'
    );
$function$;
revoke all on function public.recipe_vault_valid_text_list(text[], integer, integer) from public, anon;
grant execute on function public.recipe_vault_valid_text_list(text[], integer, integer) to authenticated, service_role;

create function public.recipe_vault_valid_recipe_tags(entries text[])
returns boolean
language sql immutable parallel safe set search_path = ''
as $function$
  select cardinality(entries) <= 32 and not exists (
    select 1 from unnest(entries) as item
    where item is null or char_length(item) not between 1 and 64
      or item <> btrim(item) or item !~ '^[a-z0-9](?:[a-z0-9_-]| [a-z0-9])*$'
  ) and cardinality(entries) = (
    select count(distinct item) from unnest(entries) as item
  );
$function$;
revoke all on function public.recipe_vault_valid_recipe_tags(text[]) from public, anon;
grant execute on function public.recipe_vault_valid_recipe_tags(text[]) to authenticated, service_role;

alter table public.recipes
  add column title text,
  add column description text,
  add column source_url text,
  add column prep_minutes integer,
  add column cook_minutes integer,
  add column total_minutes integer,
  add column yield_amount numeric,
  add column yield_unit text,
  add column tags text[] not null default '{}'::text[],
  add column notes text[] not null default '{}'::text[],
  add column instructions text[] not null default '{}'::text[],
  add column ingredients jsonb,
  add column equipment jsonb;

alter table public.recipes disable trigger recipes_set_updated_at;
update public.recipes as recipe
set title = recipe.document ->> 'title',
    description = recipe.document ->> 'description',
    source_url = recipe.document ->> 'sourceUrl',
    prep_minutes = nullif(recipe.document #>> '{time,prepMinutes}', '')::integer,
    cook_minutes = nullif(recipe.document #>> '{time,cookMinutes}', '')::integer,
    total_minutes = nullif(recipe.document #>> '{time,totalMinutes}', '')::integer,
    yield_amount = nullif(recipe.document #>> '{yield,amount}', '')::numeric,
    yield_unit = recipe.document #>> '{yield,unit}',
    tags = array(select jsonb_array_elements_text(recipe.document -> 'tags')),
    notes = array(select jsonb_array_elements_text(recipe.document -> 'notes')),
    instructions = array(select jsonb_array_elements_text(recipe.document -> 'instructions')),
    ingredients = recipe.document -> 'ingredients',
    equipment = recipe.document -> 'equipment';
alter table public.recipes enable trigger recipes_set_updated_at;


do $verify_backfill$
begin
  if exists (
    select 1 from public.recipes as recipe
    where recipe.title is distinct from recipe.document ->> 'title'
      or recipe.description is distinct from recipe.document ->> 'description'
      or recipe.source_url is distinct from recipe.document ->> 'sourceUrl'
      or recipe.prep_minutes is distinct from nullif(recipe.document #>> '{time,prepMinutes}', '')::integer
      or recipe.cook_minutes is distinct from nullif(recipe.document #>> '{time,cookMinutes}', '')::integer
      or recipe.total_minutes is distinct from nullif(recipe.document #>> '{time,totalMinutes}', '')::integer
      or recipe.yield_amount is distinct from nullif(recipe.document #>> '{yield,amount}', '')::numeric
      or recipe.yield_unit is distinct from recipe.document #>> '{yield,unit}'
      or to_jsonb(recipe.tags) is distinct from recipe.document -> 'tags'
      or to_jsonb(recipe.notes) is distinct from recipe.document -> 'notes'
      or to_jsonb(recipe.instructions) is distinct from recipe.document -> 'instructions'
      or recipe.ingredients is distinct from recipe.document -> 'ingredients'
      or recipe.equipment is distinct from recipe.document -> 'equipment'
  ) then
    raise exception 'recipe column backfill does not match source documents';
  end if;
end;
$verify_backfill$;

alter table public.recipes
  alter column title set not null,
  alter column description set not null,
  alter column ingredients set not null,
  alter column equipment set not null;

alter table public.recipes
  add constraint recipes_column_title_check check (char_length(title) between 1 and 200 and title !~ '^[[:space:]]|[[:space:]]$'),
  add constraint recipes_column_description_check check (char_length(description) <= 2000),
  add constraint recipes_column_source_url_check check (source_url is null or (char_length(source_url) <= 2000 and source_url ~* '^https?://[^/?#[:space:]]+([/?#][^[:space:]]*)?$')),
  add constraint recipes_column_prep_minutes_check check (prep_minutes is null or prep_minutes >= 0),
  add constraint recipes_column_cook_minutes_check check (cook_minutes is null or cook_minutes >= 0),
  add constraint recipes_column_total_minutes_check check (total_minutes is null or total_minutes >= 0),
  add constraint recipes_column_yield_check check ((yield_amount is null) = (yield_unit is null) and (yield_amount is null or (yield_amount > 0 and yield_amount::text not in ('NaN', 'Infinity', '-Infinity'))) and (yield_unit is null or (char_length(yield_unit) between 1 and 64 and yield_unit !~ '^[[:space:]]|[[:space:]]$'))),
  add constraint recipes_column_tags_check check (public.recipe_vault_valid_recipe_tags(tags)),
  add constraint recipes_column_notes_check check (public.recipe_vault_valid_text_list(notes, 0, 10000)),
  add constraint recipes_column_instructions_check check (public.recipe_vault_valid_text_list(instructions, 1, 5031)),
  add constraint recipes_column_ingredients_check check (extensions.jsonb_matches_schema(
    '{"type":"array","minItems":1,"items":{"type":"object","additionalProperties":false,"required":["name"],"properties":{"name":{"type":"string","minLength":1,"maxLength":200,"pattern":"^\\S(?:[\\s\\S]*\\S)?$"},"amount":{"type":"string","minLength":1,"maxLength":128,"pattern":"^\\S(?:[\\s\\S]*\\S)?$"},"note":{"type":"string","minLength":1,"maxLength":1000,"pattern":"^\\S(?:[\\s\\S]*\\S)?$"}}}}'::json,
    ingredients)),
  add constraint recipes_column_equipment_check check (extensions.jsonb_matches_schema(
    '{"type":"array","items":{"type":"object","additionalProperties":false,"required":["name"],"properties":{"name":{"type":"string","minLength":1,"maxLength":200,"pattern":"^\\S(?:[\\s\\S]*\\S)?$"},"note":{"type":"string","minLength":1,"maxLength":1000,"pattern":"^\\S(?:[\\s\\S]*\\S)?$"}}}}'::json,
    equipment));

drop index if exists public.recipes_title_text_trgm_idx;
create index recipes_column_title_trgm_idx on public.recipes using gin (title gin_trgm_ops);

-- Rebuild the public document payload only at the RPC boundary.
create or replace function public.recipe_vault_write_recipe_document(
  target_owner_id text, target_recipe_id uuid, target_expected_revision integer, target_document jsonb
)
returns table (status text, recipe_id uuid, revision integer, document jsonb)
language plpgsql security definer set search_path = ''
as $function$
declare
  caller_id text := public.recipe_vault_current_clerk_user_id();
  is_service boolean := coalesce((select auth.jwt() ->> 'role' = 'service_role'), false);
  saved_id uuid; saved_revision integer; saved_document jsonb;
  row_document jsonb;
begin
  if target_owner_id is null or target_owner_id = '' then raise exception 'not authorized' using errcode = '42501'; end if;
  if not is_service and (caller_id is null or caller_id <> target_owner_id) then raise exception 'not authorized' using errcode = '42501'; end if;
  if target_document is null or jsonb_typeof(target_document) is distinct from 'object'
    or (target_recipe_id is null) <> (target_expected_revision is null)
    or (target_recipe_id is not null and target_expected_revision < 1)
    or not target_document ?& array['title','description','time','ingredients','equipment','instructions','notes','tags']
    or target_document - array['title','description','time','yield','sourceUrl','ingredients','equipment','instructions','notes','tags'] <> '{}'::jsonb
    or jsonb_typeof(target_document->'time') is distinct from 'object'
    or (target_document->'time') - array['prepMinutes','cookMinutes','totalMinutes'] <> '{}'::jsonb
    or jsonb_typeof(target_document->'ingredients') is distinct from 'array'
    or jsonb_typeof(target_document->'equipment') is distinct from 'array'
    or jsonb_typeof(target_document->'instructions') is distinct from 'array'
    or jsonb_typeof(target_document->'notes') is distinct from 'array'
    or jsonb_typeof(target_document->'tags') is distinct from 'array'
    or (target_document ? 'yield' and (jsonb_typeof(target_document->'yield') is distinct from 'object'
      or (target_document->'yield') - array['amount','unit'] <> '{}'::jsonb
      or not (target_document->'yield' ?& array['amount','unit']))) then
    return query select 'invalid'::text, null::uuid, null::integer, null::jsonb; return;
  end if;
  perform public.recipe_vault_lock_document_owner(target_owner_id);
  if target_recipe_id is not null then
    select r.revision into saved_revision from public.recipes r where r.id = target_recipe_id and r.owner_id = target_owner_id for update;
    if not found then return query select 'not_found'::text, null::uuid, null::integer, null::jsonb; return; end if;
    if saved_revision <> target_expected_revision then return query select 'conflict'::text, target_recipe_id, saved_revision, null::jsonb; return; end if;
  end if;
  begin
    if target_recipe_id is null then
      insert into public.recipes(owner_id,title,description,source_url,prep_minutes,cook_minutes,total_minutes,yield_amount,yield_unit,tags,notes,instructions,ingredients,equipment)
      values (target_owner_id,target_document->>'title',target_document->>'description',target_document->>'sourceUrl',nullif(target_document#>>'{time,prepMinutes}','')::integer,nullif(target_document#>>'{time,cookMinutes}','')::integer,nullif(target_document#>>'{time,totalMinutes}','')::integer,nullif(target_document#>>'{yield,amount}','')::numeric,target_document#>>'{yield,unit}',array(select jsonb_array_elements_text(target_document->'tags')),array(select jsonb_array_elements_text(target_document->'notes')),array(select jsonb_array_elements_text(target_document->'instructions')),target_document->'ingredients',target_document->'equipment')
      returning recipes.id, recipes.revision into saved_id, saved_revision;
    else
      update public.recipes r set title=target_document->>'title', description=target_document->>'description', source_url=target_document->>'sourceUrl', prep_minutes=nullif(target_document#>>'{time,prepMinutes}','')::integer, cook_minutes=nullif(target_document#>>'{time,cookMinutes}','')::integer, total_minutes=nullif(target_document#>>'{time,totalMinutes}','')::integer, yield_amount=nullif(target_document#>>'{yield,amount}','')::numeric, yield_unit=target_document#>>'{yield,unit}', tags=array(select jsonb_array_elements_text(target_document->'tags')), notes=array(select jsonb_array_elements_text(target_document->'notes')), instructions=array(select jsonb_array_elements_text(target_document->'instructions')), ingredients=target_document->'ingredients', equipment=target_document->'equipment', revision=r.revision+1
      where r.id=target_recipe_id and r.owner_id=target_owner_id and r.revision=target_expected_revision returning r.revision into saved_revision;
      if not found then return query select 'conflict'::text,target_recipe_id,null::integer,null::jsonb; return; end if;
      saved_id := target_recipe_id;
    end if;
    select jsonb_strip_nulls(jsonb_build_object(
      'title',r.title,'description',r.description,
      'time', jsonb_strip_nulls(jsonb_build_object('prepMinutes',r.prep_minutes,'cookMinutes',r.cook_minutes,'totalMinutes',r.total_minutes)),
      'yield', case when r.yield_amount is null then null else jsonb_build_object('amount',r.yield_amount,'unit',r.yield_unit) end,
      'sourceUrl',r.source_url,'ingredients',r.ingredients,'equipment',r.equipment,'instructions',to_jsonb(r.instructions),'notes',to_jsonb(r.notes),'tags',to_jsonb(r.tags)))
    into row_document from public.recipes r where r.id=saved_id;
    -- The time property is required by the recipe contract even when empty.
    saved_document := jsonb_set(row_document,'{time}',coalesce(row_document->'time','{}'::jsonb),true);
  exception when check_violation or not_null_violation or data_exception then
    return query select 'invalid'::text,null::uuid,null::integer,null::jsonb; return;
  end;
  return query select 'saved'::text,saved_id,saved_revision,saved_document;
end;
$function$;
revoke all on function public.recipe_vault_write_recipe_document(text,uuid,integer,jsonb) from public,anon;
grant execute on function public.recipe_vault_write_recipe_document(text,uuid,integer,jsonb) to authenticated,service_role;

create or replace function public.recipe_vault_delete_recipe_document(
  target_owner_id text, target_recipe_id uuid, target_expected_revision integer,
  target_audit_request_id text default null, target_audit_method text default null
)
returns table(status text,recipe_id uuid,revision integer)
language plpgsql security definer set search_path=''
as $function$
declare
  caller_id text:=public.recipe_vault_current_clerk_user_id();
  is_service boolean:=coalesce((select auth.jwt()->>'role'='service_role'),false);
  current_revision integer; deleted_count integer;
begin
  if target_owner_id is null or target_owner_id='' then raise exception 'not authorized' using errcode='42501'; end if;
  if not is_service and (caller_id is null or caller_id<>target_owner_id) then raise exception 'not authorized' using errcode='42501'; end if;
  if target_recipe_id is null or target_expected_revision is null or target_expected_revision<1
    or ((target_audit_request_id is null)<>(target_audit_method is null)) then
    return query select 'invalid'::text,null::uuid,null::integer; return;
  end if;
  perform public.recipe_vault_lock_document_owner(target_owner_id);
  select r.revision into current_revision from public.recipes r where r.id=target_recipe_id and r.owner_id=target_owner_id for update;
  if not found then return query select 'not_found'::text,null::uuid,null::integer; return; end if;
  if current_revision<>target_expected_revision then return query select 'conflict'::text,target_recipe_id,current_revision; return; end if;
  delete from public.recipes r where r.id=target_recipe_id and r.owner_id=target_owner_id and r.revision=target_expected_revision;
  get diagnostics deleted_count=row_count;
  if deleted_count<>1 then return query select 'not_found'::text,null::uuid,null::integer; return; end if;
  if target_audit_request_id is not null then
    insert into public.recipe_audit_events(owner_id,recipe_id,actor_id,event_type,event_data)
    values(target_owner_id,null,coalesce(caller_id,target_owner_id),'recipe.deleted',jsonb_build_object('requestId',target_audit_request_id,'method',target_audit_method,'recipeId',target_recipe_id));
  end if;
  return query select 'deleted'::text,target_recipe_id,current_revision;
end;
$function$;
revoke all on function public.recipe_vault_delete_recipe_document(text,uuid,integer,text,text) from public,anon;
grant execute on function public.recipe_vault_delete_recipe_document(text,uuid,integer,text,text) to authenticated,service_role;

-- Tag inventory and replacement now read and write the text[] column.
drop function public.recipe_vault_list_document_tag_inventory(text,text,text,bigint,text,integer);
create or replace function public.recipe_vault_list_document_tag_inventory(
  target_owner_id text,target_search text,target_sort text,after_usage_count bigint,after_name text,
  before_usage_count bigint,before_name text,target_limit integer
)
returns table(name text,usage_count bigint) language plpgsql stable security invoker set search_path=''
as $function$
begin
  if target_sort not in ('name_asc','usage_desc','usage_asc') or target_sort is null then raise exception 'Invalid tag sort order' using errcode='22023'; end if;
  if target_limit is null or target_limit not between 1 and 100 then raise exception 'Invalid tag page size' using errcode='22023'; end if;
  if (after_name is not null and before_name is not null) or (target_sort='name_asc' and (after_usage_count is not null or before_usage_count is not null)) or (target_sort<>'name_asc' and ((after_name is null)<>(after_usage_count is null) or (before_name is null)<>(before_usage_count is null))) then raise exception 'Tag cursor does not match the selected sort order' using errcode='22023'; end if;
  return query with expanded as (select r.id, unnest(r.tags) tag from public.recipes r where r.owner_id=target_owner_id), inventory as (select e.tag,count(distinct e.id) used_by from expanded e where target_search is null or strpos(lower(e.tag),lower(btrim(target_search)))>0 group by e.tag), page as (
    select i.tag,i.used_by from inventory i where (after_name is null and before_name is null) or after_name is not null and (target_sort='name_asc' and i.tag>after_name or target_sort='usage_asc' and (i.used_by,i.tag)>(after_usage_count,after_name) or target_sort='usage_desc' and (i.used_by<after_usage_count or i.used_by=after_usage_count and i.tag>after_name)) or before_name is not null and (target_sort='name_asc' and i.tag<before_name or target_sort='usage_asc' and (i.used_by,i.tag)<(before_usage_count,before_name) or target_sort='usage_desc' and (i.used_by>before_usage_count or i.used_by=before_usage_count and i.tag<before_name))
    order by case when target_sort='name_asc' and before_name is null then i.tag end asc,case when target_sort='name_asc' and before_name is not null then i.tag end desc,case when target_sort='usage_asc' and before_name is null then i.used_by end asc,case when target_sort='usage_asc' and before_name is not null then i.used_by end desc,case when target_sort='usage_desc' and before_name is null then i.used_by end desc,case when target_sort='usage_desc' and before_name is not null then i.used_by end asc,case when target_sort<>'name_asc' and before_name is null then i.tag end asc,case when target_sort<>'name_asc' and before_name is not null then i.tag end desc limit target_limit)
  select p.tag,p.used_by from page p order by case when target_sort='name_asc' then p.tag end asc,case when target_sort='usage_asc' then p.used_by end asc,case when target_sort='usage_desc' then p.used_by end desc,case when target_sort<>'name_asc' then p.tag end asc;
end;
$function$;
revoke all on function public.recipe_vault_list_document_tag_inventory(text,text,text,bigint,text,bigint,text,integer) from public,anon;
grant execute on function public.recipe_vault_list_document_tag_inventory(text,text,text,bigint,text,bigint,text,integer) to authenticated,service_role;

-- Keep the original six-argument SQL call shape for existing callers/tests.
create function public.recipe_vault_list_document_tag_inventory(
  target_owner_id text,target_search text,target_sort text,after_usage_count bigint,after_name text,target_limit integer
)
returns table(name text,usage_count bigint) language sql stable security invoker set search_path=''
as $function$
  select * from public.recipe_vault_list_document_tag_inventory(
    target_owner_id,target_search,target_sort,after_usage_count,after_name,null,null,target_limit
  );
$function$;
revoke all on function public.recipe_vault_list_document_tag_inventory(text,text,text,bigint,text,integer) from public,anon;
grant execute on function public.recipe_vault_list_document_tag_inventory(text,text,text,bigint,text,integer) to authenticated,service_role;

create or replace function public.recipe_vault_list_recipe_ids_by_document_tag(target_owner_id text,target_tag_name text)
returns table(recipe_id uuid) language sql stable security invoker set search_path=''
as $function$ select r.id from public.recipes r where r.owner_id=target_owner_id and target_tag_name=any(r.tags) order by r.id; $function$;

create or replace function public.recipe_vault_replace_document_tag(target_owner_id text,source_name text,target_name text)
returns table(status text,changed_recipes integer) language plpgsql security definer set search_path=''
as $function$
declare caller_id text:=public.recipe_vault_current_clerk_user_id(); is_service boolean:=coalesce((select auth.jwt()->>'role'='service_role'),false); changed_count integer;
begin
  if target_owner_id is null or target_owner_id='' then raise exception 'invalid owner' using errcode='22023'; end if;
  if not is_service and (caller_id is null or caller_id<>target_owner_id) then raise exception 'not authorized' using errcode='42501'; end if;
  if source_name is null or target_name is null or char_length(source_name) not between 1 and 64 or char_length(target_name) not between 1 and 64 or source_name !~ '^[a-z0-9]([a-z0-9_-]| [a-z0-9])*$' or target_name !~ '^[a-z0-9]([a-z0-9_-]| [a-z0-9])*$' or source_name=target_name then raise exception 'invalid canonical tag name' using errcode='22023'; end if;
  perform public.recipe_vault_lock_document_owner(target_owner_id);
  perform r.id from public.recipes r where r.owner_id=target_owner_id and source_name=any(r.tags) order by r.id for update;
  if not found then return query select 'source_missing'::text,0; return; end if;
  with expanded as materialized (select r.id recipe_id,case when t.tag=source_name then target_name else t.tag end tag,t.position from public.recipes r cross join lateral unnest(r.tags) with ordinality t(tag,position) where r.owner_id=target_owner_id and source_name=any(r.tags)), dedup as (select e.*,row_number() over(partition by recipe_id,tag order by position) n from expanded e), replaced as (select recipe_id,array_agg(tag order by position) tags from dedup where n=1 group by recipe_id)
  update public.recipes r set tags=x.tags,revision=r.revision+1,updated_at=now() from replaced x where r.id=x.recipe_id and r.owner_id=target_owner_id and source_name=any(r.tags);
  get diagnostics changed_count=row_count; return query select 'replaced'::text,changed_count;
end;
$function$;

-- Search remains owner-filtered in the RLS query and emits the same JSON payload.
create or replace function public.recipe_vault_search_recipe_documents(target_owner_id text,target_search text,target_tags text[],target_offset integer,target_limit integer)
returns jsonb language plpgsql stable security invoker set search_path=''
as $function$
declare search_pattern text; result jsonb;
begin
  if target_owner_id is null or target_owner_id='' then raise exception 'Owner is required' using errcode='22023'; end if;
  if target_offset is null or target_offset<0 then raise exception 'Offset is invalid' using errcode='22023'; end if;
  if target_limit is null or target_limit<1 or target_limit>1000 then raise exception 'Page size is invalid' using errcode='22023'; end if;
  if target_search is not null and btrim(target_search) <> '' then
    search_pattern := '%' || replace(
      replace(replace(btrim(target_search), E'\\', E'\\\\'), '%', E'\\%'),
      '_', E'\\_'
    ) || '%';
  end if;
  with rows as materialized (select r.id,r.title,r.description,r.source_url,r.prep_minutes,r.cook_minutes,r.total_minutes,r.yield_amount,r.yield_unit,r.ingredients,r.equipment,r.instructions,r.notes,r.tags,r.revision,r.created_at,r.updated_at from public.recipes r where r.owner_id=target_owner_id and (search_pattern is null or r.title ilike search_pattern escape E'\\' or r.description ilike search_pattern escape E'\\' or exists(select 1 from jsonb_array_elements(r.ingredients) i where i->>'name' ilike search_pattern escape E'\\') or exists(select 1 from jsonb_array_elements(r.equipment) e where e->>'name' ilike search_pattern escape E'\\') or exists(select 1 from unnest(r.tags) t where t ilike search_pattern escape E'\\')) and (coalesce(cardinality(target_tags),0)=0 or r.tags && target_tags)), page as (select * from rows order by updated_at desc,id asc offset target_offset limit target_limit)
  select jsonb_build_object(
    'items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', page.id,
            'document', jsonb_strip_nulls(jsonb_build_object(
              'title', page.title,
              'description', page.description,
              'sourceUrl', page.source_url,
              'time', jsonb_strip_nulls(jsonb_build_object(
                'prepMinutes', page.prep_minutes,
                'cookMinutes', page.cook_minutes,
                'totalMinutes', page.total_minutes
              )),
              'yield', case when page.yield_amount is null then null
                else jsonb_build_object('amount', page.yield_amount, 'unit', page.yield_unit)
              end,
              'ingredients', page.ingredients,
              'equipment', page.equipment,
              'instructions', to_jsonb(page.instructions),
              'notes', to_jsonb(page.notes),
              'tags', to_jsonb(page.tags)
            )),
            'revision', page.revision,
            'created_at', page.created_at,
            'updated_at', page.updated_at
          ) order by page.updated_at desc, page.id asc
        )
        from page
      ),
      '[]'::jsonb
    ),
    'total', (select count(*) from rows)
  ) into result;
  return result;
end;
$function$;
revoke all on function public.recipe_vault_search_recipe_documents(text,text,text[],integer,integer) from public,anon;
grant execute on function public.recipe_vault_search_recipe_documents(text,text,text[],integer,integer) to authenticated,service_role;

alter table public.recipes drop constraint if exists recipes_document_schema_check;
alter table public.recipes drop column title_text, drop column document;

do $verify_preserved$
begin
  if exists(select 1 from recipe_column_storage_snapshot b full join public.recipes a using(id) where b.id is null or a.id is null or b.owner_id is distinct from a.owner_id or b.created_at is distinct from a.created_at or b.updated_at is distinct from a.updated_at or b.revision is distinct from a.revision) then raise exception 'recipe conversion changed identity, ownership, timestamps, or revision'; end if;
  if exists(select 1 from recipe_column_storage_audit_snapshot b full join public.recipe_audit_events a using(id) where b.id is null or a.id is null or b.row_data is distinct from to_jsonb(a)) then raise exception 'recipe conversion changed audit history'; end if;
end;
$verify_preserved$;

commit;
