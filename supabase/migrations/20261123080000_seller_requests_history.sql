-- Solicitações de cadastro de lojistas: arquivar, excluir definitivamente e histórico completo.
-- Toda ação fica em care_store_admin_audit (action 'solicitacao_*'), inclusive a exclusão,
-- que grava um snapshot do pedido antes de apagá-lo.

alter table public.care_store_seller_requests
  add column if not exists archived_at timestamptz;

-- 1) Mudança de situação/resposta passa a ser registrada no histórico.
create or replace function public.care_store_admin_update_request(p_id uuid, p_status text, p_notes text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.care_store_seller_requests;
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  if p_status not in ('nova', 'em_analise', 'aprovada', 'recusada') then raise exception 'Invalid status'; end if;

  select * into r from public.care_store_seller_requests where id = p_id;
  if not found then raise exception 'Request not found'; end if;

  update public.care_store_seller_requests
     set status = p_status, admin_notes = v_notes, reviewed_at = now()
   where id = p_id;

  perform public.care_store_audit(null, 'solicitacao_atualizada', jsonb_build_object(
    'request_id', p_id,
    'business_name', r.business_name,
    'status_anterior', r.status,
    'status_novo', p_status,
    'nota', v_notes
  ));
end $$;

-- 2) Arquivar (guardar) e desarquivar.
create or replace function public.care_store_admin_archive_request(p_id uuid, p_archive boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.care_store_seller_requests;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;

  select * into r from public.care_store_seller_requests where id = p_id;
  if not found then raise exception 'Request not found'; end if;

  update public.care_store_seller_requests
     set archived_at = case when coalesce(p_archive, false) then now() else null end
   where id = p_id;

  perform public.care_store_audit(null,
    case when coalesce(p_archive, false) then 'solicitacao_arquivada' else 'solicitacao_desarquivada' end,
    jsonb_build_object('request_id', p_id, 'business_name', r.business_name));
end $$;

-- 3) Excluir definitivamente. Exige digitar o nome da empresa para confirmar.
create or replace function public.care_store_admin_delete_request(p_id uuid, p_confirm text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r public.care_store_seller_requests;
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;

  select * into r from public.care_store_seller_requests where id = p_id;
  if not found then raise exception 'Request not found'; end if;
  if btrim(coalesce(p_confirm, '')) <> r.business_name then raise exception 'Name mismatch'; end if;

  perform public.care_store_audit(null, 'solicitacao_excluida', jsonb_build_object(
    'request_id', p_id,
    'business_name', r.business_name,
    'snapshot', to_jsonb(r)
  ));

  delete from public.care_store_seller_requests where id = p_id;
end $$;

-- 4) Histórico: de um pedido, ou de todos os pedidos (mais recentes primeiro).
create or replace function public.care_store_admin_request_log(p_request uuid default null, p_limit int default 500)
returns setof public.care_store_admin_audit
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_nextvita_platform_admin() then raise exception 'Admin only'; end if;
  return query
    select a.* from public.care_store_admin_audit a
     where starts_with(a.action, 'solicitacao_')
       and (p_request is null or a.details ->> 'request_id' = p_request::text)
     order by a.created_at desc
     limit least(greatest(coalesce(p_limit, 500), 1), 2000);
end $$;

revoke all on function public.care_store_admin_archive_request(uuid, boolean) from public, anon;
revoke all on function public.care_store_admin_delete_request(uuid, text) from public, anon;
revoke all on function public.care_store_admin_request_log(uuid, int) from public, anon;
grant execute on function public.care_store_admin_archive_request(uuid, boolean) to authenticated;
grant execute on function public.care_store_admin_delete_request(uuid, text) to authenticated;
grant execute on function public.care_store_admin_request_log(uuid, int) to authenticated;
