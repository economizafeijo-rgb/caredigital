-- Fila em tempo real para o painel do atendente.
-- A equipe da loja precisa ler as linhas da fila para receber as mudanças pelo Realtime.

drop policy if exists queue_select_staff on public.care_store_queue;
create policy queue_select_staff on public.care_store_queue for select to authenticated
  using (public.care_store_can_attend(vendor_id));

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.care_store_queue;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
