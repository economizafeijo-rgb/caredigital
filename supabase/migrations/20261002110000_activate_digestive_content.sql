alter table public.digestive_protocols
  add column if not exists is_active boolean not null default true;

alter table public.diet_plans
  add column if not exists is_active boolean not null default true;

update public.digestive_protocols set is_active = true;
update public.diet_plans set is_active = true;

drop policy if exists "Digestive protocols are readable" on public.digestive_protocols;
create policy "Digestive protocols are readable"
  on public.digestive_protocols for select to anon, authenticated
  using (is_active = true);

drop policy if exists "Diet plans are readable" on public.diet_plans;
create policy "Diet plans are readable"
  on public.diet_plans for select to anon, authenticated
  using (is_active = true);
