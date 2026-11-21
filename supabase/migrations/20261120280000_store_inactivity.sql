-- Inatividade do cliente no atendimento: avisos, encerramento automático e avanço da fila.
-- Executado no servidor (pg_cron, a cada minuto), vale mesmo com a aba fechada.
-- O relógio só corre quando o cliente deve responder (última mensagem é da loja).
-- Sinais de conexão não renovam o prazo; só mensagens do cliente e o botão "Continuar atendimento".

alter table public.care_store_messages add column if not exists is_system boolean not null default false;

alter table public.care_store_vendors
  add column if not exists inactivity_warn_minutes integer not null default 3 check (inactivity_warn_minutes between 1 and 60),
  add column if not exists inactivity_grace_minutes integer not null default 2 check (inactivity_grace_minutes between 1 and 60),
  add column if not exists inactivity_close_minutes integer not null default 1 check (inactivity_close_minutes between 1 and 60);

alter table public.care_store_queue
  add column if not exists last_customer_activity timestamptz,
  add column if not exists inactivity_stage text not null default 'ok' check (inactivity_stage in ('ok', 'aviso1', 'aviso2')),
  add column if not exists stage_at timestamptz;

-- Encerramento interno (sem checagem de usuário): usado pelo atendente e pela inatividade. Libera e avança a fila.
create or replace function public.care_store_close_internal(p_vendor uuid, p_customer uuid, p_reason text)
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_closed integer;
begin
  if p_reason not in ('atendido', 'inatividade', 'encerrado_atendente', 'sem_atendente', 'desconectado') then
    raise exception 'Invalid reason';
  end if;
  update public.care_store_queue set status = 'closed', closed_at = now(), close_reason = p_reason,
         inactivity_stage = 'ok', stage_at = null
   where vendor_id = p_vendor and customer_id = p_customer and status = 'active';
  get diagnostics v_closed = row_count;
  if v_closed > 0 then perform public.care_store_assign_next(p_vendor); end if;
  return v_closed;
end;
$$;
revoke all on function public.care_store_close_internal(uuid, uuid, text) from public, anon, authenticated;

-- Encerramento pelo atendente (com permissão).
create or replace function public.care_store_close_chat(p_vendor uuid, p_customer uuid, p_reason text)
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if not public.care_store_can_attend(p_vendor) then raise exception 'Not allowed'; end if;
  return public.care_store_close_internal(p_vendor, p_customer, p_reason);
end;
$$;
grant execute on function public.care_store_close_chat(uuid, uuid, text) to authenticated;

-- Atividade do cliente: mensagem enviada ou toque em "Continuar atendimento".
create or replace function public.care_store_messages_activity()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.is_system then return new; end if;
  update public.care_store_queue
     set last_customer_activity = case when new.from_vendor then last_customer_activity else now() end,
         inactivity_stage = 'ok', stage_at = null
   where vendor_id = new.vendor_id and customer_id = new.customer_id and status = 'active';
  return new;
end;
$$;
drop trigger if exists care_store_messages_activity on public.care_store_messages;
create trigger care_store_messages_activity after insert on public.care_store_messages
  for each row execute function public.care_store_messages_activity();

create or replace function public.care_store_customer_ping(p_vendor uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare v_uid uuid := auth.uid(); v_n integer;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.care_store_queue
     set last_customer_activity = now(), inactivity_stage = 'ok', stage_at = null
   where vendor_id = p_vendor and customer_id = v_uid and status = 'active';
  get diagnostics v_n = row_count;
  return jsonb_build_object('renewed', v_n > 0);
end;
$$;
revoke all on function public.care_store_customer_ping(uuid) from public, anon;
grant execute on function public.care_store_customer_ping(uuid) to authenticated;

-- Verificação a cada minuto. Idempotente: cada etapa só avança uma vez (linhas travadas com SKIP LOCKED).
create or replace function public.care_store_inactivity_tick()
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  r record; v_lv timestamptz; v_lc timestamptz; v_n integer := 0;
begin
  for r in
    select q.id, q.vendor_id, q.customer_id, q.inactivity_stage, q.stage_at, q.last_customer_activity,
           v.inactivity_warn_minutes as w, v.inactivity_grace_minutes as g, v.inactivity_close_minutes as c
      from public.care_store_queue q
      join public.care_store_vendors v on v.id = q.vendor_id
     where q.status = 'active'
     for update of q skip locked
  loop
    select max(created_at) into v_lv from public.care_store_messages
     where vendor_id = r.vendor_id and customer_id = r.customer_id and from_vendor and not is_system;
    select max(created_at) into v_lc from public.care_store_messages
     where vendor_id = r.vendor_id and customer_id = r.customer_id and not from_vendor and deleted_at is null;
    v_lc := greatest(coalesce(v_lc, '-infinity'::timestamptz), coalesce(r.last_customer_activity, '-infinity'::timestamptz));

    -- A loja deve a resposta: o relógio do cliente está parado.
    if v_lv is null or v_lc >= v_lv then continue; end if;

    if r.inactivity_stage = 'ok' and now() - v_lv >= make_interval(mins => r.w) then
      insert into public.care_store_messages(vendor_id, customer_id, from_vendor, is_system, body)
      values (r.vendor_id, r.customer_id, true, true,
        'Você ainda está por aqui? Responda ou toque em “Continuar atendimento” para manter a conversa aberta.');
      update public.care_store_queue set inactivity_stage = 'aviso1', stage_at = now() where id = r.id;
      v_n := v_n + 1;
    elsif r.inactivity_stage = 'aviso1' and now() - r.stage_at >= make_interval(mins => r.g) then
      insert into public.care_store_messages(vendor_id, customer_id, from_vendor, is_system, body)
      values (r.vendor_id, r.customer_id, true, true,
        'Seu atendimento será encerrado em 1 minuto por inatividade.');
      update public.care_store_queue set inactivity_stage = 'aviso2', stage_at = now() where id = r.id;
      v_n := v_n + 1;
    elsif r.inactivity_stage = 'aviso2' and now() - r.stage_at >= make_interval(mins => r.c) then
      insert into public.care_store_messages(vendor_id, customer_id, from_vendor, is_system, body)
      values (r.vendor_id, r.customer_id, true, true,
        'Atendimento encerrado por inatividade. Você pode iniciar uma nova conversa quando precisar.');
      perform public.care_store_close_internal(r.vendor_id, r.customer_id, 'inatividade');
      v_n := v_n + 1;
    end if;
  end loop;
  return v_n;
end;
$$;
revoke all on function public.care_store_inactivity_tick() from public, anon, authenticated;

-- Agenda a verificação a cada minuto quando o pg_cron estiver disponível.
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'care-store-inactivity';
  perform cron.schedule('care-store-inactivity', '* * * * *', 'select public.care_store_inactivity_tick()');
exception when others then
  raise notice 'pg_cron indisponível: agende public.care_store_inactivity_tick() a cada minuto.';
end $$;
