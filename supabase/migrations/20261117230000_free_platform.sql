-- Plataforma gratuita: sem prazo de teste. Quem estava em teste ou expirado passa a ter acesso gratuito sem validade.
-- (Contas suspensas pelo administrador continuam suspensas.)
update public.care_patients
   set license_status = 'gratuita', license_expires_on = null
 where license_status in ('teste', 'expirada', 'ativa') and (license_status <> 'ativa' or license_expires_on is not null);

create or replace function public.care_start_trial(p_name text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_owner uuid;
  v_patient uuid;
  v_name text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select email into v_email from auth.users where id = v_uid;
  if exists (select 1 from public.care_patient_access where user_id = v_uid)
     or exists (select 1 from public.care_patients where owner_id = v_uid) then
    raise exception 'Account already linked';
  end if;
  if exists (select 1 from public.care_patients where lower(contact_email) = lower(v_email) and trial_started_at is not null) then
    raise exception 'Trial already used';
  end if;
  select id into v_owner from auth.users where lower(email) = 'francdenisbr@gmail.com' limit 1;
  if v_owner is null then raise exception 'Administrator account not found'; end if;
  v_name := coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1));
  insert into public.care_patients (owner_id, full_name, contact_email, license_plan, license_status, license_expires_on, signup_source, trial_started_at)
  values (v_owner, left(v_name, 120), v_email, 'premium', 'gratuita', null, 'teste_gratis', now())
  returning id into v_patient;
  insert into public.care_patient_access (patient_id, owner_id, user_id) values (v_patient, v_owner, v_uid);
  return jsonb_build_object('patient_id', v_patient, 'expires_on', null);
end $$;
revoke all on function public.care_start_trial(text) from public;
grant execute on function public.care_start_trial(text) to authenticated;
