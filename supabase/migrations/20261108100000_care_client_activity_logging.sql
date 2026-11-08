-- Registro independente de atividade física no prontuário do cliente.
-- O horário real é sempre gerado no servidor e o acesso é validado pelo vínculo do paciente.
create or replace function public.care_log_client_activity(
  p_patient_id uuid,
  p_activity_type text,
  p_duration_minutes integer,
  p_distance_km numeric default null,
  p_intensity text default 'moderada',
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_now timestamptz := clock_timestamp();
  v_id uuid;
  v_type text := lower(btrim(coalesce(p_activity_type, '')));
  v_intensity text := lower(btrim(coalesce(p_intensity, 'moderada')));
  v_notes text := btrim(coalesce(p_notes, ''));
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if v_type not in ('caminhada','corrida','ciclismo','musculacao','natacao','outro') then
    raise exception 'Invalid activity type';
  end if;
  if p_duration_minutes is null or p_duration_minutes < 1 or p_duration_minutes > 1440 then
    raise exception 'Duration must be between 1 and 1440 minutes';
  end if;
  if p_distance_km is not null and (p_distance_km < 0 or p_distance_km > 500) then
    raise exception 'Distance must be between 0 and 500 km';
  end if;
  if v_intensity not in ('leve','moderada','intensa') then
    raise exception 'Invalid intensity';
  end if;
  if char_length(v_notes) > 500 then raise exception 'Notes are too long'; end if;

  select p.owner_id into v_owner
  from public.care_patients p
  where p.id = p_patient_id
    and (
      p.owner_id = v_uid
      or exists (
        select 1 from public.care_patient_access a
        where a.patient_id = p.id and a.user_id = v_uid
      )
    )
  limit 1;
  if v_owner is null then raise exception 'Patient access denied'; end if;

  insert into public.care_activity_log
    (owner_id, patient_id, task_id, category, event_type, scheduled_at,
     happened_at, recorded_at, actor_id, source, details)
  values
    (v_owner, p_patient_id, null, 'atividade', 'logged', null,
     v_now, v_now, v_uid, 'client_activity',
     jsonb_build_object(
       'activity_type', v_type,
       'title', case v_type
         when 'caminhada' then 'Caminhada'
         when 'corrida' then 'Corrida'
         when 'ciclismo' then 'Ciclismo'
         when 'musculacao' then 'Musculação'
         when 'natacao' then 'Natação'
         else 'Outra atividade'
       end,
       'duration_minutes', p_duration_minutes,
       'distance_km', p_distance_km,
       'intensity', v_intensity,
       'notes', v_notes
     ))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'happened_at', v_now);
end;
$$;

revoke all on function public.care_log_client_activity(uuid,text,integer,numeric,text,text) from public, anon;
grant execute on function public.care_log_client_activity(uuid,text,integer,numeric,text,text) to authenticated;
