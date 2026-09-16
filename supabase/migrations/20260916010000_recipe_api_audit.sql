-- Iteration 3: allow a caller-scoped application service to append safe audit metadata.
-- Direct writes remain unavailable to authenticated users.
create function public.recipe_vault_record_audit_event(
  target_recipe_id uuid,
  target_owner_id uuid,
  audit_event_type text,
  audit_event_data jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or auth.uid() <> target_owner_id then
    raise exception 'not authorized';
  end if;
  if audit_event_type !~ '^[a-z][a-z0-9_.-]{0,99}$'
    or jsonb_typeof(audit_event_data) <> 'object' then
    raise exception 'invalid audit event';
  end if;

  insert into public.recipe_audit_events (owner_id, recipe_id, actor_id, event_type, event_data)
  values (target_owner_id, target_recipe_id, auth.uid(), audit_event_type, audit_event_data);
end;
$$;

grant execute on function public.recipe_vault_record_audit_event(uuid, uuid, text, jsonb) to authenticated;
