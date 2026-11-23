-- Histórico do chat: a atendente vê só as conversas que ela mesma atendeu.
-- Dono, operador e visualizador continuam vendo o histórico da loja inteira.

create or replace function public.care_store_is_attendant(p_vendor uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.care_store_staff s
     where s.vendor_id = p_vendor and s.user_id = auth.uid() and s.active and s.role = 'atendente'
  )
  and not exists (select 1 from public.care_store_vendors v where v.id = p_vendor and v.owner_id = auth.uid())
$$;
revoke all on function public.care_store_is_attendant(uuid) from public, anon;
grant execute on function public.care_store_is_attendant(uuid) to authenticated;

create or replace function public.care_store_chat_history_list(
  p_vendor uuid, p_search text default null, p_limit integer default 100
) returns table (
  id uuid, customer_id uuid, customer_name text, started_at timestamptz, closed_at timestamptz,
  close_reason text, message_count integer, preview text
)
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_mine_only boolean;
begin
  if not public.care_store_can_attend(p_vendor) then raise exception 'Not your store'; end if;
  v_mine_only := public.care_store_is_attendant(p_vendor);
  return query
    select a.id, a.customer_id, a.customer_name, a.started_at, a.closed_at, a.close_reason,
           a.message_count,
           left(coalesce((select e ->> 'body' from jsonb_array_elements(a.messages) e
                           where not (e ->> 'is_system')::boolean
                           order by e ->> 'created_at' desc limit 1), ''), 140)
      from public.care_store_chat_archive a
     where a.vendor_id = p_vendor and a.vendor_deleted_at is null
       and a.closed_at > now() - interval '30 days'
       and (not v_mine_only or a.agent_id = auth.uid())
       and (p_search is null or btrim(p_search) = ''
            or a.customer_name ilike '%' || p_search || '%'
            or a.messages::text ilike '%' || p_search || '%')
     order by a.closed_at desc
     limit least(greatest(coalesce(p_limit, 100), 1), 500);
end $$;
revoke all on function public.care_store_chat_history_list(uuid, text, integer) from public, anon;
grant execute on function public.care_store_chat_history_list(uuid, text, integer) to authenticated;

create or replace function public.care_store_chat_history_get(p_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare a public.care_store_chat_archive;
begin
  select * into a from public.care_store_chat_archive where id = p_id;
  if a.id is null or a.vendor_deleted_at is not null or a.closed_at <= now() - interval '30 days'
     or not public.care_store_can_attend(a.vendor_id)
     or (public.care_store_is_attendant(a.vendor_id) and a.agent_id is distinct from auth.uid()) then
    raise exception 'Not found';
  end if;
  return jsonb_build_object('id', a.id, 'customer_name', a.customer_name, 'started_at', a.started_at,
    'closed_at', a.closed_at, 'close_reason', a.close_reason, 'messages', a.messages);
end $$;
revoke all on function public.care_store_chat_history_get(uuid) from public, anon;
grant execute on function public.care_store_chat_history_get(uuid) to authenticated;
