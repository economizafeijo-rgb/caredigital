-- Hidratação: libera todos os tipos de bebida que a tela oferece e permite trocar tipo e nome do líquido.
alter table public.care_client_beverages drop constraint if exists care_client_beverages_kind_check;
alter table public.care_client_beverages add constraint care_client_beverages_kind_check
  check (kind in ('agua','cha','suco','cafe','energetico','suplemento','shake','isotonico','vitamina','leite','agua_coco','refrigerante','outra'));

create or replace function public.care_log_client_beverage(
 p_patient_id uuid, p_kind text, p_name text, p_amount_ml integer, p_notes text default ''
) returns timestamptz
language plpgsql security definer set search_path=public, pg_temp
as $$
declare
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select p.owner_id into v_owner from public.care_patients p
  where p.id = p_patient_id and (
    p.owner_id = v_uid or exists (
      select 1 from public.care_patient_access a
      where a.patient_id=p.id and a.user_id=v_uid
    )
  );
  if not found then raise exception 'Patient unavailable'; end if;
  if p_kind is null or p_kind not in ('cha','agua','suco','cafe','energetico','suplemento','shake','isotonico','vitamina','leite','agua_coco','refrigerante','outra')
    or p_name is null or char_length(btrim(p_name)) not between 2 and 100
    or p_amount_ml is null or p_amount_ml not between 10 and 1500
    or char_length(coalesce(p_notes,'')) > 300 then
    raise exception 'Beverage fields invalid';
  end if;
  insert into public.care_client_beverages
    (owner_id, patient_id, recorded_by, kind, name, amount_ml, notes, consumed_at, created_at)
  values (v_owner, p_patient_id, v_uid, p_kind, btrim(p_name), p_amount_ml,
    coalesce(p_notes,''), v_now, v_now);
  return v_now;
end;
$$;

-- Edição de um líquido já registrado: tipo, nome, volume e horário. Guarda antes/depois no histórico.
create or replace function public.care_update_client_beverage(
 p_patient_id uuid, p_entry_id uuid, p_kind text, p_name text, p_amount_ml integer, p_consumed_at timestamptz
) returns jsonb
language plpgsql security definer set search_path=public, pg_temp
as $$
declare
  v_owner uuid;
  v_uid uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_old public.care_client_beverages%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select p.owner_id into v_owner from public.care_patients p
  where p.id = p_patient_id and (
    p.owner_id = v_uid or exists (
      select 1 from public.care_patient_access a
      where a.patient_id=p.id and a.user_id=v_uid
    )
  );
  if not found then raise exception 'Patient unavailable'; end if;
  if p_kind is null or p_kind not in ('cha','suco','cafe','energetico','suplemento','shake','isotonico','vitamina','leite','agua_coco','refrigerante','outra')
    or p_name is null or char_length(btrim(p_name)) not between 2 and 100
    or p_amount_ml is null or p_amount_ml not between 10 and 1500
    or p_consumed_at is null or p_consumed_at > v_now + interval '1 minute' then
    raise exception 'Beverage fields invalid';
  end if;
  select * into v_old from public.care_client_beverages b
  where b.id = p_entry_id and b.patient_id = p_patient_id and b.owner_id = v_owner
  for update;
  if not found then raise exception 'Beverage record unavailable'; end if;
  update public.care_client_beverages
     set kind = p_kind, name = btrim(p_name), amount_ml = p_amount_ml, consumed_at = p_consumed_at
   where id = v_old.id;
  insert into public.care_activity_log(owner_id,patient_id,category,event_type,
    scheduled_at,happened_at,recorded_at,actor_id,source,details)
  values (v_owner, p_patient_id, 'hidratacao', 'intake_edited', null, p_consumed_at,
    v_now, v_uid, 'client_intake_maintenance',
    jsonb_build_object('entry_type','beverage','entry_id',p_entry_id,
      'before', jsonb_build_object('kind',v_old.kind,'name',v_old.name,'amount_ml',v_old.amount_ml,'consumed_at',v_old.consumed_at),
      'after', jsonb_build_object('kind',p_kind,'name',btrim(p_name),'amount_ml',p_amount_ml,'consumed_at',p_consumed_at)));
  return jsonb_build_object('success',true,'entry_id',p_entry_id,'kind',p_kind,'name',btrim(p_name),
    'amount_ml',p_amount_ml,'consumed_at',p_consumed_at);
end;
$$;
revoke all on function public.care_update_client_beverage(uuid,uuid,text,text,integer,timestamptz) from public, anon;
grant execute on function public.care_update_client_beverage(uuid,uuid,text,text,integer,timestamptz) to authenticated;
