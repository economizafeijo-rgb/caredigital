-- Encerramento de atendimento: arquiva tudo que ainda não foi arquivado e limpa o chat ao vivo.
-- Vale para qualquer motivo (atendido, inatividade, encerrado pelo atendente, desconectado).
-- O avanço da fila já é feito por care_store_close_internal -> care_store_assign_next.
-- Um novo atendimento começa com o painel limpo, sem resquícios de conversas anteriores.

create or replace function public.care_store_queue_archive_trg()
returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if new.status = 'closed' and old.status is distinct from 'closed' then
    -- Sem janela de início: arquiva tudo o que ainda não está no arquivo, até o encerramento.
    perform public.care_store_archive_pair(
      new.vendor_id, new.customer_id, coalesce(new.close_reason, 'encerrado'),
      new.id, new.agent_id, null, coalesce(new.closed_at, now()));
    -- O que está no arquivo sai do chat ao vivo.
    delete from public.care_store_messages
     where vendor_id = new.vendor_id and customer_id = new.customer_id
       and created_at <= coalesce(new.closed_at, now());
  end if;
  return new;
end $$;
