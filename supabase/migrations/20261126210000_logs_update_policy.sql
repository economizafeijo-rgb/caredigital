-- Permite corrigir registros de micção, cafeína e lactose (a tela só libera depois de 24 h com a senha).
do $$
declare t text;
begin
  foreach t in array array['care_urination_logs','care_caffeine_logs','care_lactose_logs'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_update', t);
      execute format($p$create policy %I on public.%I for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))$p$, t || '_update', t);
      execute format('grant update on public.%I to authenticated', t);
    end if;
  end loop;
end $$;
