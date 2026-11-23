-- Limpeza do chat do cliente.
-- 1) Botão "Limpar conversa": o cliente limpa o próprio chat. A loja mantém o histórico no arquivo.
-- 2) Limpeza automática: quando todas as mensagens do par já foram lidas e 10 minutos se passaram
--    desde a última leitura, o chat é arquivado e limpo. Só vale para pares sem atendimento ativo na
--    fila, porque o relógio de inatividade depende das mensagens da loja. Ao encerrar um atendimento,
--    o chat já é limpo pelo gatilho de encerramento.

create or replace function public.care_store_clear_pair(p_vendor uuid, p_customer uuid, p_reason text)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  v_cut timestamptz := now();
  v_n integer;
begin
  -- Arquiva tudo o que ainda não está no arquivo, até agora; depois tira do chat ao vivo.
  perform public.care_store_archive_pair(p_vendor, p_customer, p_reason, null, null, null, v_cut);
  delete from public.care_store_messages
   where vendor_id = p_vendor and customer_id = p_customer and created_at <= v_cut;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
revoke all on function public.care_store_clear_pair(uuid, uuid, text) from public, anon, authenticated;

-- Botão do cliente.
create or replace function public.care_store_customer_clear_chat(p_vendor uuid)
returns integer
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  return public.care_store_clear_pair(p_vendor, auth.uid(), 'limpo_pelo_cliente');
end $$;
revoke all on function public.care_store_customer_clear_chat(uuid) from public, anon;
grant execute on function public.care_store_customer_clear_chat(uuid) to authenticated;

-- Limpeza automática: pares lidos há 10 minutos e sem atendimento ativo.
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
     where not exists (
             select 1 from public.care_store_queue q
              where q.vendor_id = m.vendor_id and q.customer_id = m.customer_id and q.status = 'active')
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

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'care-store-autoclear';
  perform cron.schedule('care-store-autoclear', '*/5 * * * *', 'select public.care_store_auto_clear_tick()');
exception when others then
  raise notice 'pg_cron indisponível: agende public.care_store_auto_clear_tick() a cada 5 minutos.';
end $$;
