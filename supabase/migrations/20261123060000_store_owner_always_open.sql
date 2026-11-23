-- Dono da loja: sem restrição de horário (pode abrir e fechar a loja a qualquer hora, por exemplo
-- para o balanço). Funcionários continuam no expediente. Limite de 3 aparelhos vale para todos.
create or replace function public.care_store_device_check(p_device uuid)
returns text
language plpgsql
security definer
set search_path = 'public', 'pg_temp'
as $function$
declare
  v_uid uuid := auth.uid();
  v_now timestamp := now() at time zone 'America/Rio_Branco';
  v_owner boolean;
  v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_device is null then raise exception 'Device required'; end if;

  v_owner := exists (select 1 from public.care_store_vendors v where v.owner_id = v_uid);
  if not v_owner
     and not exists (select 1 from public.care_store_staff s where s.user_id = v_uid and s.active) then
    return 'not_store';
  end if;

  -- Funcionário: fora do expediente (domingo, antes de 08h, a partir de 17h ou feriado).
  if not v_owner and (
       extract(isodow from v_now) = 7
       or v_now::time < time '08:00'
       or v_now::time >= time '17:00'
       or exists (select 1 from public.care_store_holidays h where h.day = v_now::date)) then
    return 'expediente';
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
$function$;
