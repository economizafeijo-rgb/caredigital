create or replace function public.is_nextvita_platform_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) = 'francdenisbr@gmail.com'; $$;
revoke all on function public.is_nextvita_platform_admin() from public, anon;
grant execute on function public.is_nextvita_platform_admin() to authenticated;
drop policy if exists "platform admin reads patients" on public.care_patients;
create policy "platform admin reads patients" on public.care_patients for select to authenticated using (public.is_nextvita_platform_admin());
drop policy if exists "platform admin creates patients" on public.care_patients;
create policy "platform admin creates patients" on public.care_patients for insert to authenticated with check (public.is_nextvita_platform_admin());
drop policy if exists "platform admin updates patients" on public.care_patients;
create policy "platform admin updates patients" on public.care_patients for update to authenticated using (public.is_nextvita_platform_admin()) with check (public.is_nextvita_platform_admin());
drop policy if exists "platform admin deletes patients" on public.care_patients;
create policy "platform admin deletes patients" on public.care_patients for delete to authenticated using (public.is_nextvita_platform_admin());
grant select, insert, update, delete on public.care_patients to authenticated;
