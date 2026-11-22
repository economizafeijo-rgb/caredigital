-- Chat só fica ativo quando há atendente online. "Estamos offline" no painel deixa o chat inativo
-- para os clientes (a tela avisa e o banco recusa novas mensagens de cliente).
create or replace function public.care_store_store_status(p_vendor uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_cap integer; v_present integer; v_free integer; v_active integer; v_waiting integer;
begin
  select chat_capacity into v_cap from public.care_store_vendors where id = p_vendor and status = 'ativo';
  if v_cap is null then raise exception 'Vendor unavailable'; end if;
  select count(*) into v_present from public.care_store_presence
   where vendor_id = p_vendor and online and last_seen > now() - interval '60 seconds';
  select count(*) into v_active from public.care_store_queue where vendor_id = p_vendor and status = 'active';
  select count(*) into v_waiting from public.care_store_queue where vendor_id = p_vendor and status = 'waiting';
  v_free := greatest(v_present * v_cap - v_active, 0);
  return jsonb_build_object(
    'open', v_present > 0,
    'agents_online', v_present,
    'capacity_per_agent', v_cap,
    'active', v_active,
    'waiting', v_waiting,
    'free_slots', v_free,
    'now', now());
end;
$$;

drop policy if exists messages_insert on public.care_store_messages;
create policy messages_insert on public.care_store_messages for insert to authenticated
  with check (
    (not from_vendor and customer_id = auth.uid()
       and exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.status = 'ativo')
       and coalesce((public.care_store_store_status(vendor_id)->>'open')::boolean, false))
    or (from_vendor and public.care_store_can_attend(vendor_id))
  );
