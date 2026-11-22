-- O lojista pode abrir a loja e acessar o painel a qualquer hora (sem expediente fixo).
-- Mantém o limite de 3 dispositivos por conta de loja.
create or replace function public.care_store_device_check(p_device uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_device is null then raise exception 'Device required'; end if;

  if not exists (select 1 from public.care_store_vendors v where v.owner_id = v_uid)
     and not exists (select 1 from public.care_store_staff s where s.user_id = v_uid and s.active) then
    return 'not_store';
  end if;

  delete from public.care_store_devices where user_id = v_uid and last_seen < now() - interval '24 hours';

  if exists (select 1 from public.care_store_devices where user_id = v_uid and device_id = p_device) then
    update public.care_store_devices set last_seen = now() where user_id = v_uid and device_id = p_device;
    return 'ok';
  end if;

  select count(*) into v_count from public.care_store_devices where user_id = v_uid;
  if v_count >= 3 then return 'limit'; end if;

  insert into public.care_store_devices(user_id, device_id) values (v_uid, p_device);
  return 'ok';
end;
$$;

-- Loja aberta pelo lojista libera o chat para os clientes, mesmo sem atendente online no momento.
-- As mensagens ficam registradas e a loja responde assim que possível.
create or replace function public.care_store_store_status(p_vendor uuid)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare v_cap integer; v_open boolean; v_present integer; v_free integer; v_active integer; v_waiting integer;
begin
  select chat_capacity, coalesce(is_open, false) into v_cap, v_open
    from public.care_store_vendors where id = p_vendor and status = 'ativo';
  if v_cap is null then raise exception 'Vendor unavailable'; end if;
  select count(*) into v_present from public.care_store_presence
   where vendor_id = p_vendor and online and last_seen > now() - interval '60 seconds';
  select count(*) into v_active from public.care_store_queue where vendor_id = p_vendor and status = 'active';
  select count(*) into v_waiting from public.care_store_queue where vendor_id = p_vendor and status = 'waiting';
  v_free := greatest(v_present * v_cap - v_active, 0);
  return jsonb_build_object(
    'open', (v_present > 0 or v_open),
    'agents_online', v_present,
    'capacity_per_agent', v_cap,
    'active', v_active,
    'waiting', v_waiting,
    'free_slots', v_free,
    'now', now());
end;
$$;
