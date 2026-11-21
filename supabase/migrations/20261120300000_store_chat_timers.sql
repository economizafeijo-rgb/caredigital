-- Prazos de inatividade para o painel do atendente.
-- Usa a mesma regra do encerramento automático (care_store_inactivity_tick):
-- o relógio só corre quando a loja falou por último e o cliente ainda não respondeu.
-- Nomes de saída com prefixo "out_" para não colidir com colunas das tabelas.

create or replace function public.care_store_chat_timers(p_vendor uuid)
returns table(
  out_customer_id uuid,
  out_stage text,
  out_deadline timestamptz,
  out_paused boolean,
  out_server_now timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  r record;
  v_lv timestamptz;
  v_lc timestamptz;
  v_w integer;
  v_g integer;
begin
  if not public.care_store_can_attend(p_vendor) then
    raise exception 'Sem permissão para ver os atendimentos desta loja.' using errcode = '42501';
  end if;

  select v.inactivity_warn_minutes, v.inactivity_grace_minutes
    into v_w, v_g
    from public.care_store_vendors v
   where v.id = p_vendor;

  for r in
    select q.customer_id, q.inactivity_stage, q.stage_at, q.last_customer_activity
      from public.care_store_queue q
     where q.vendor_id = p_vendor and q.status = 'active'
  loop
    select max(m.created_at) into v_lv from public.care_store_messages m
     where m.vendor_id = p_vendor and m.customer_id = r.customer_id and m.from_vendor and not m.is_system;
    select max(m.created_at) into v_lc from public.care_store_messages m
     where m.vendor_id = p_vendor and m.customer_id = r.customer_id and not m.from_vendor and m.deleted_at is null;
    v_lc := greatest(coalesce(v_lc, '-infinity'::timestamptz), coalesce(r.last_customer_activity, '-infinity'::timestamptz));

    out_customer_id := r.customer_id;
    out_stage := r.inactivity_stage;
    out_server_now := now();

    if v_lv is null or v_lc >= v_lv then
      -- Cliente falou por último: o relógio está parado.
      out_paused := true;
      out_deadline := null;
    else
      out_paused := false;
      out_deadline := case r.inactivity_stage
        when 'ok' then v_lv + make_interval(mins => v_w)
        when 'aviso1' then r.stage_at + make_interval(mins => v_g)
        else r.stage_at + make_interval(mins => (select c.inactivity_close_minutes from public.care_store_vendors c where c.id = p_vendor))
      end;
    end if;
    return next;
  end loop;
end $$;

revoke all on function public.care_store_chat_timers(uuid) from public, anon;
grant execute on function public.care_store_chat_timers(uuid) to authenticated;
