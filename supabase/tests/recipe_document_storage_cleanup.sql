do $$
declare
  legacy_name text;
  required_column text;
begin
  foreach legacy_name in array array[
    'recipe_ingredients',
    'recipe_steps',
    'recipe_tags',
    'tags'
  ] loop
    if pg_catalog.to_regclass('public.' || legacy_name) is not null then
      raise exception 'legacy table public.% still exists', legacy_name;
    end if;
  end loop;

  foreach legacy_name in array array[
    'title',
    'summary',
    'prep_time_minutes',
    'cook_time_minutes',
    'total_time_minutes',
    'servings',
    'tags',
    'source_url',
    'notes'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'recipes'
        and column_name = legacy_name
    ) then
      raise exception 'legacy recipes.% column still exists', legacy_name;
    end if;
  end loop;

  foreach required_column in array array[
    'id', 'owner_id', 'created_at', 'updated_at', 'document', 'revision', 'title_text'
  ] loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'recipes'
        and column_name = required_column
    ) then
      raise exception 'required recipes.% column is missing', required_column;
    end if;
  end loop;

  if pg_catalog.to_regclass('public.recipe_audit_events') is null then
    raise exception 'recipe audit history table is missing';
  end if;

  if pg_catalog.to_regprocedure('public.recipe_vault_write_recipe_document(text,uuid,integer,jsonb)') is null
    or pg_catalog.to_regprocedure('public.recipe_vault_delete_recipe_document(text,uuid,integer,text,text)') is null
    or pg_catalog.to_regprocedure('public.recipe_vault_list_document_tag_inventory(text,text,text,bigint,text,bigint,text,integer)') is null
    or pg_catalog.to_regprocedure('public.recipe_vault_replace_document_tag(text,text,text)') is null
    or pg_catalog.to_regprocedure('public.recipe_vault_record_audit_event(uuid,text,text,jsonb)') is null then
    raise exception 'an active document or audit RPC is missing';
  end if;

  if pg_catalog.to_regprocedure('public.recipe_vault_write_recipe(text,uuid,jsonb,jsonb,jsonb)') is not null
    or pg_catalog.to_regprocedure('public.recipe_vault_list_tag_inventory(text,text,text,text,bigint,text,uuid,integer,bigint,text,uuid)') is not null
    or pg_catalog.to_regprocedure('public.recipe_vault_delete_unused_tag(text,uuid)') is not null
    or pg_catalog.to_regprocedure('public.recipe_vault_merge_tags(text,uuid,uuid)') is not null then
    raise exception 'a legacy recipe or tag RPC still exists';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger trigger
    where trigger.tgrelid = 'public.recipes'::regclass
      and trigger.tgname = 'recipes_set_updated_at'
      and not trigger.tgisinternal
  ) then
    raise exception 'recipes updated_at trigger is missing';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_class relation
    where relation.oid = 'public.recipes'::regclass
      and relation.relrowsecurity
  ) or not exists (
    select 1 from pg_catalog.pg_policy policy
    where policy.polrelid = 'public.recipes'::regclass
      and policy.polname = 'Clerk users can select owned recipes'
  ) then
    raise exception 'recipes RLS or Clerk owner read policy is missing';
  end if;
end;
$$;
