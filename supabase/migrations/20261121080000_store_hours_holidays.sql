-- Expediente das lojas: segunda a sábado, das 08h às 17h (horário do Acre), exceto feriados.
-- Feriados ficam numa tabela para o administrador incluir os municipais e estaduais.
create table if not exists public.care_store_holidays (
  day date primary key,
  name text not null
);
alter table public.care_store_holidays enable row level security;
revoke all on public.care_store_holidays from anon, authenticated;
grant select on public.care_store_holidays to anon, authenticated;
drop policy if exists holidays_read on public.care_store_holidays;
create policy holidays_read on public.care_store_holidays for select to anon, authenticated using (true);

insert into public.care_store_holidays(day, name) values
  ('2026-01-01', 'Confraternização Universal'),
  ('2026-02-16', 'Carnaval'),
  ('2026-02-17', 'Carnaval'),
  ('2026-04-03', 'Paixão de Cristo'),
  ('2026-04-21', 'Tiradentes'),
  ('2026-05-01', 'Dia do Trabalho'),
  ('2026-06-04', 'Corpus Christi'),
  ('2026-09-07', 'Independência do Brasil'),
  ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),
  ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Dia da Consciência Negra'),
  ('2026-12-25', 'Natal')
on conflict (day) do nothing;

-- Chamada a cada login e periodicamente. Devolve:
-- 'ok' (dispositivo registrado), 'limit' (3 já conectados), 'expediente' (fora de seg a sáb 08h–17h ou feriado),
-- 'not_store' (conta sem loja: não se aplica).
create or replace function public.care_store_device_check(p_device uuid)
returns text
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamp := now() at time zone 'America/Rio_Branco';
  v_count integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_device is null then raise exception 'Device required'; end if;

  if not exists (select 1 from public.care_store_vendors v where v.owner_id = v_uid)
     and not exists (select 1 from public.care_store_staff s where s.user_id = v_uid and s.active) then
    return 'not_store';
  end if;

  -- Domingo (7), antes de 08h, a partir de 17h ou feriado: fora do expediente.
  if extract(isodow from v_now) = 7
     or v_now::time < time '08:00'
     or v_now::time >= time '17:00'
     or exists (select 1 from public.care_store_holidays h where h.day = v_now::date) then
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
$$;

revoke all on function public.care_store_device_check(uuid) from public, anon;
grant execute on function public.care_store_device_check(uuid) to authenticated;

-- Horário exibido na vitrine da Bela Vista.
update public.care_store_vendors set opening_hours = 'Seg a sáb · 8h às 17h' where slug = 'bela-vista-fitness';
