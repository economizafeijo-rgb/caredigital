-- Equipe da loja (com permissão de atendimento) lê, responde e marca mensagens como lidas.
-- Antes, só o dono da loja tinha essas permissões nas mensagens.

drop policy if exists messages_select on public.care_store_messages;
create policy messages_select on public.care_store_messages for select to authenticated
  using (
    customer_id = auth.uid()
    or public.is_nextvita_platform_admin()
    or public.care_store_can_attend(vendor_id)
  );

drop policy if exists messages_insert on public.care_store_messages;
create policy messages_insert on public.care_store_messages for insert to authenticated
  with check (
    (not from_vendor and customer_id = auth.uid()
       and exists (select 1 from public.care_store_vendors v where v.id = vendor_id and v.status = 'ativo'))
    or (from_vendor and public.care_store_can_attend(vendor_id))
  );

drop policy if exists messages_mark_read on public.care_store_messages;
create policy messages_mark_read on public.care_store_messages for update to authenticated
  using (customer_id = auth.uid() or public.care_store_can_attend(vendor_id))
  with check (customer_id = auth.uid() or public.care_store_can_attend(vendor_id));
