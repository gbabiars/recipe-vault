-- Verify private Clerk ownership and audit behavior against column storage.
-- The transaction rolls back all fixture rows and audit events.

begin;
select set_config('test.recipe_rls_token', gen_random_uuid()::text, true);

insert into public.recipes (owner_id,title,description,ingredients,equipment,instructions)
values ('recipe_rls_owner_a','Private A','', '[{"name":"salt"}]'::jsonb,'[]'::jsonb,array['Season.']);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_rls_owner_a","role":"authenticated"}',
  true
);

do $verify$
declare
  target_recipe_id uuid;
begin
  select id into target_recipe_id from public.recipes
  where title = 'Private A';
  if target_recipe_id is null then
    raise exception 'Owner could not read their own document';
  end if;

  perform public.recipe_vault_record_audit_event(
    target_recipe_id,
    'recipe_rls_owner_a',
    'recipe.updated',
    '{"verification":true}'::jsonb
  );
  if not exists (
    select 1 from public.recipe_audit_events
    where recipe_audit_events.recipe_id = target_recipe_id
      and actor_id = 'recipe_rls_owner_a'
  ) then
    raise exception 'Owner-scoped audit event was not recorded';
  end if;
end;
$verify$;

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"recipe_rls_owner_b","role":"authenticated"}',
  true
);

do $verify$
declare
  visible_rows integer;
  changed_rows integer;
  unauthorized_audit_blocked boolean := false;
  owner_a_recipe_id uuid;
  create_result record;
begin
  select count(*) into visible_rows from public.recipes;
  if visible_rows <> 0 then
    raise exception 'Other Clerk user could read a private recipe';
  end if;
  select count(*) into visible_rows from public.recipe_audit_events;
  if visible_rows <> 0 then
    raise exception 'Other Clerk user could read audit data';
  end if;

  select id into owner_a_recipe_id from public.recipes
  where owner_id = 'recipe_rls_owner_a';
  begin
    perform public.recipe_vault_record_audit_event(
      owner_a_recipe_id,
      'recipe_rls_owner_a',
      'recipe.updated',
      '{}'::jsonb
    );
  exception when raise_exception then
    unauthorized_audit_blocked := true;
  end;
  if not unauthorized_audit_blocked then
    raise exception 'Other Clerk user could write an audit event for another owner';
  end if;

  select * into create_result
  from public.recipe_vault_write_recipe_document(
    'recipe_rls_owner_b', null, null,
    '{"title":"Private B","description":"","time":{},"ingredients":[{"name":"beans"}],"equipment":[],"instructions":["Cook."],"notes":[],"tags":[]}'::jsonb
  );
  if create_result.status <> 'saved' then
    raise exception 'Second Clerk user could not create their private document: %', create_result;
  end if;
  begin
    update public.recipes
    set title = 'Intruded'
    where owner_id = 'recipe_rls_owner_a';
    get diagnostics changed_rows = row_count;
    if changed_rows <> 0 then
      raise exception 'Other Clerk user updated an owned document';
    end if;
    raise exception 'Authenticated role unexpectedly had direct recipe UPDATE';
  exception when insufficient_privilege then
    null;
  end;

  select count(*) into visible_rows from public.recipes;
  if visible_rows <> 1 then
    raise exception 'Second Clerk user could not create their private document';
  end if;
end;
$verify$;

reset role;
set local role anon;
do $verify$
begin
  begin
    perform 1 from public.recipes;
    raise exception 'Anonymous user could query private recipes';
  exception when insufficient_privilege then
    null;
  end;
end;
$verify$;

rollback;
