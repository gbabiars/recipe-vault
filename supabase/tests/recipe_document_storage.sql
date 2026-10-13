-- Run after all migrations against a disposable local Supabase database.
-- Verifies typed recipe columns, complex JSONB fields, and owner RLS.
begin;

select set_config('test.recipe_column_token', gen_random_uuid()::text, true);

do $verify$
declare
  recipe_id uuid;
  fixture_title text := 'Column recipe ' || current_setting('test.recipe_column_token');
begin
  insert into public.recipes (
    owner_id,title,description,prep_minutes,yield_amount,yield_unit,tags,notes,
    instructions,ingredients,equipment
  ) values (
    'recipe_column_storage_owner',fixture_title,'No yield is stated.',5,null,null,
    array['weeknight'],array[]::text[],array['Slice the onion.'],
    '[{"name":"onion","amount":"1"}]'::jsonb,'[]'::jsonb
  ) returning id into recipe_id;

  if (select revision from public.recipes where id=recipe_id) <> 1 then
    raise exception 'new recipe revision did not default to 1';
  end if;
  if (select ingredients->0->>'name' from public.recipes where id=recipe_id) <> 'onion' then
    raise exception 'complex ingredient JSONB was not retained';
  end if;
  if (select instructions[1] from public.recipes where id=recipe_id) <> 'Slice the onion.' then
    raise exception 'ordered instruction array was not retained';
  end if;

  update public.recipes set yield_amount=24,yield_unit='cookies' where id=recipe_id;
  if not found then raise exception 'valid optional yield was rejected'; end if;

  begin
    update public.recipes set yield_amount=0 where id=recipe_id;
    raise exception 'nonpositive yield was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.recipes set tags=array['weeknight','weeknight']::text[] where id=recipe_id;
    raise exception 'duplicate tags were accepted';
  exception when check_violation then null;
  end;

  begin
    update public.recipes set yield_amount='NaN'::numeric where id=recipe_id;
    raise exception 'non-finite yield was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.recipes set ingredients='[{"amount":"1"}]'::jsonb where id=recipe_id;
    raise exception 'ingredient without a name was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.recipes set equipment='[{"name":"pan","unexpected":true}]'::jsonb where id=recipe_id;
    raise exception 'equipment with an unknown property was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.recipes set instructions=array[]::text[] where id=recipe_id;
    raise exception 'recipe without instructions was accepted';
  exception when check_violation then null;
  end;
end;
$verify$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"recipe_column_storage_other","role":"authenticated"}',true);
do $verify$
declare changed_rows integer;
begin
  if exists(select 1 from public.recipes where title like 'Column recipe %') then
    raise exception 'other owner could read a private recipe';
  end if;
  begin
    update public.recipes set title='Intruded' where title like 'Column recipe %';
    get diagnostics changed_rows=row_count;
    if changed_rows<>0 then raise exception 'other owner could update a private recipe'; end if;
    raise exception 'authenticated role unexpectedly had direct recipe UPDATE';
  exception when insufficient_privilege then null;
  end;
end;
$verify$;
rollback;
