-- Limpeza automática também durante o atendimento.
-- O relógio de inatividade passa a usar a hora da última mensagem da loja guardada na fila
-- (queue.last_vendor_msg_at), e não mais as mensagens do chat, que a limpeza pode apagar.

alter table public.care_store_queue
  add column if not exists last_vendor_msg_at timestamptz;

-- Preenche as sessões abertas com a última mensagem da loja já existente.
update public.care_store_queue q
   set last_vendor_msg_at = (
         select max(m.created_at) from public.care_store_messages m
          where m.vendor_id = q.vendor_id and m.customer_id = q.customer_id
            and m.from_vendor and not m.is_system)
 where q.status = 'active';

-- Atividade: mensagem da loja guarda a hora na fila; mensagem do cliente renova o prazo.
create or replace function public.care_store_messages_activity()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.is_system then return new; end if;
  if new.from_vendor then
    update public.care_store_queue
       set last_vendor_msg_at = greatest(coalesce(last_vendor_msg_at, '-infinity'::timestamptz), new.created_at),
           inactivity_stage = 'ok', stage_at = null
     where vendor_id = new.vendor_id and customer_id = new.customer_id and status = 'active';
  else
    update public.care_store_queue
       set last_customer_activity = now(), inactivity_stage = 'ok', stage_at = null
     where vendor_id = new.vendor_id and customer_id = new.customer_id and status = 'active';
  end if;
  return new;
end;
$$;

-- Verificação de inatividade: mesma regra de antes, com a hora da loja vinda da fila.
create or replace function public.care_store_inactivity_tick()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  r record; v_lv timestamptz; v_lc timestamptz; v_n integer := 0;
begin
  for r in
    select q.id, q.vendor_id, q.customer_id, q.inactivity_stage, q.stage_at, q.last_customer_activity,
           q.last_vendor_msg_at,
           v.inactivity_warn_minutes as w, v.inactivity_grace_minutes as g, v.inactivity_close_minutes as c
      from public.care_store_queue q
      join public.care_store_vendors v on v.id = q.vendor_id
     where q.status = 'active'
     for update of q skip locked
  loop
    v_lv := r.last_vendor_msg_at;
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

-- Limpeza automática: todas as mensagens lidas e a última leitura há 10 minutos. Vale também durante o
-- atendimento; o arquivo guarda cada parte da conversa e o relógio continua na fila.
create or replace function public.care_store_auto_clear_tick()
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  r record;
  v_n integer := 0;
begin
  for r in
    select m.vendor_id, m.customer_id
      from public.care_store_messages m
     group by m.vendor_id, m.customer_id
    having count(*) filter (where m.read_at is null) = 0
       and max(coalesce(m.read_at, m.created_at)) < now() - interval '10 minutes'
  loop
    perform public.care_store_clear_pair(r.vendor_id, r.customer_id, 'limpeza_automatica');
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;
revoke all on function public.care_store_auto_clear_tick() from public, anon, authenticated;
