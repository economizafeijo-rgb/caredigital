-- Códigos de licença: o administrador gera, o cliente resgata e a licença é ativada na hora.
create table if not exists public.care_license_keys (
  code text primary key check (code ~ '^CARE-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  owner_id uuid not null default auth.uid(),
  plan text not null default 'premium' check (plan in ('basico','premium','profissional')),
  days integer not null check (days between 1 and 1825),
  patient_id uuid references public.care_patients(id) on delete set null,
  note text check (note is null or char_length(note) <= 120),
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_patient_id uuid references public.care_patients(id) on delete set null,
  revoked boolean not null default false
);
create index if not exists care_license_keys_owner_idx on public.care_license_keys(owner_id, created_at desc);
alter table public.care_license_keys enable row level security;
drop policy if exists license_keys_owner_all on public.care_license_keys;
create policy license_keys_owner_all on public.care_license_keys for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Resgate pelo cliente: soma os dias à validade atual (ou a hoje, se já venceu).
create or replace function public.care_redeem_license(p_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_key public.care_license_keys%rowtype;
  v_patient public.care_patients%rowtype;
  v_today date := (now() at time zone 'America/Rio_Branco')::date;
  v_until date;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select p.* into v_patient from public.care_patients p
   where exists(select 1 from public.care_patient_access a where a.patient_id = p.id and a.user_id = v_uid)
      or p.owner_id = v_uid
   order by (p.owner_id = v_uid) limit 1;
  if not found then raise exception 'Patient unavailable'; end if;
  select * into v_key from public.care_license_keys where code = upper(trim(p_code)) for update;
  if not found or v_key.revoked then raise exception 'License code invalid'; end if;
  if v_key.redeemed_at is not null then raise exception 'License code already used'; end if;
  if v_key.owner_id <> v_patient.owner_id then raise exception 'License code invalid'; end if;
  if v_key.patient_id is not null and v_key.patient_id <> v_patient.id then raise exception 'License code belongs to another client'; end if;
  v_until := greatest(coalesce(v_patient.license_expires_on, v_today), v_today) + v_key.days;
  update public.care_patients set license_status = 'ativa', license_plan = v_key.plan, license_expires_on = v_until where id = v_patient.id;
  update public.care_license_keys set redeemed_at = now(), redeemed_patient_id = v_patient.id where code = v_key.code;
  return jsonb_build_object('plan', v_key.plan, 'expires_on', v_until, 'days', v_key.days);
end $$;
revoke all on function public.care_redeem_license(text) from public;
grant execute on function public.care_redeem_license(text) to authenticated;
