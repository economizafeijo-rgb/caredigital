-- Volume por lembrete é sugestão organizacional, não quantidade a ingerir de uma vez.
-- Limitar a 350 ml e mostrar necessidade de fracionar quando faltar mais.
CREATE OR REPLACE FUNCTION public.care_recalculate_after_consumption(p_patient_id uuid, p_kind text, p_amount_ml integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
 v_now timestamptz:=clock_timestamp();
 v_day date:=(clock_timestamp() at time zone 'America/Rio_Branco')::date;
 v_cutoff timestamptz:=(date_trunc('day',clock_timestamp() at time zone 'America/Rio_Branco')+
                  interval '22 hours 50 minutes') at time zone 'America/Rio_Branco';
 v_meal_end timestamptz:=(date_trunc('day',clock_timestamp() at time zone 'America/Rio_Branco')+
                  interval '23 hours 50 minutes') at time zone 'America/Rio_Branco';
 v_owner uuid;v_goal integer;v_restrict boolean:=false;
 v_water_total integer:=0;v_remaining integer:=0;v_count int:=0;v_per_slot int:=0;
 v_min_gap int:=45;v_previous timestamptz;v_candidate timestamptz;
 v_task record;v_changed int:=0;v_meals_changed int:=0;
begin
 if p_patient_id is null or p_kind not in ('agua','bebida','refeicao','correcao_agua','meta_alterada') then
  raise exception 'Invalid adaptive care input';
 end if;
 select p.owner_id into v_owner from public.care_patients p where p.id=p_patient_id;
 if v_owner is null then return jsonb_build_object('status','no_patient');end if;
 perform pg_advisory_xact_lock(hashtextextended(p_patient_id::text||v_day::text,82));
 select coalesce(h.fluid_restriction,false) into v_restrict
 from public.care_hydration_profiles h where h.patient_id=p_patient_id;
 v_restrict:=coalesce(v_restrict,false);
 if not v_restrict then
   select gt.target_ml into v_goal from public.care_hydration_goal_targets gt
   where gt.patient_id=p_patient_id and gt.effective_date<=v_day
   order by gt.effective_date desc limit 1;
   if v_goal is null then
     select h.target_ml into v_goal from public.care_hydration_profiles h
     where h.patient_id=p_patient_id;
   end if;
 end if;
 if v_goal not between 100 and 10000 then v_goal:=null;end if;
 select coalesce(sum(h.amount_ml),0)::integer into v_water_total
 from public.care_hydration h where h.patient_id=p_patient_id
  and (h.recorded_at at time zone 'America/Rio_Branco')::date=v_day
  and h.recorded_at < ((v_day::timestamp+interval '23 hours') at time zone 'America/Rio_Branco');
 v_remaining:=greatest(0,coalesce(v_goal,0)-v_water_total);
 -- Always update the authoritative daily water rollup after a successful write/correction.
 if v_goal is not null then
   perform public.care_recompute_hydration_day(p_patient_id,v_day);
 end if;
 -- Never change fixed medication time. Move ONLY future, unresolved meal/water reminders.
 if p_kind='agua' then
   v_min_gap:=case when coalesce(p_amount_ml,0)>=750 then 90
                   when coalesce(p_amount_ml,0)>=500 then 75
                   when coalesce(p_amount_ml,0)>=300 then 60 else 45 end;
 elsif p_kind='bebida' then v_min_gap:=30;
 elsif p_kind='refeicao' then v_min_gap:=30;
 end if;
 if p_kind in ('agua','bebida','refeicao') and v_now<v_cutoff and not v_restrict then
   v_previous:=v_now;
   for v_task in
     select t.id,t.owner_id,t.title,t.scheduled_at from public.care_daily_checklist t
     where t.patient_id=p_patient_id and t.category='hidratacao'
      and t.completed_at is null and t.scheduled_at>v_now and t.scheduled_at<v_cutoff
      and (t.scheduled_at at time zone 'America/Rio_Branco')::date=v_day
      and not exists(select 1 from public.care_hydration_responses h where h.task_id=t.id and h.response='not_drunk')
      and not exists(select 1 from public.care_task_resolutions r where r.task_id=t.id)
     order by t.scheduled_at,t.id for update of t
   loop
     -- When the target was reached, keep the existing future reminders visible
     -- as optional checks; never force more water or auto-confirm a task.
     v_candidate:=v_task.scheduled_at;
     if v_goal is null or v_remaining>0 then
       v_candidate:=greatest(v_task.scheduled_at,v_previous+make_interval(mins=>v_min_gap));
     end if;
     if v_candidate<=v_cutoff and v_candidate>v_task.scheduled_at+interval '30 seconds' then
       update public.care_daily_checklist set scheduled_at=v_candidate where id=v_task.id;
       insert into public.care_activity_log
         (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
       values(v_task.owner_id,p_patient_id,v_task.id,'hidratacao','rescheduled',v_task.scheduled_at,
         null,v_now,auth.uid(),'adaptive_consumption_replan',
         jsonb_build_object('title',v_task.title,'previous_scheduled_at',v_task.scheduled_at,
           'next_scheduled_at',v_candidate,'kind',p_kind,'amount_ml',p_amount_ml,
           'reason','minimum_reminder_gap_after_consumption','gap_minutes',v_min_gap));
       v_changed:=v_changed+1;
     else
       v_candidate:=v_task.scheduled_at;
     end if;
     v_previous:=v_candidate;
   end loop;
 end if;
 if p_kind='refeicao' and v_now<v_meal_end then
   v_previous:=v_now;
   for v_task in
     select t.id,t.owner_id,t.title,t.scheduled_at from public.care_daily_checklist t
     where t.patient_id=p_patient_id and t.category='refeicao'
      and t.completed_at is null and t.scheduled_at>v_now and t.scheduled_at<v_meal_end
      and (t.scheduled_at at time zone 'America/Rio_Branco')::date=v_day
      and not exists(select 1 from public.care_task_resolutions r where r.task_id=t.id)
     order by t.scheduled_at,t.id for update of t
   loop
     v_candidate:=greatest(v_task.scheduled_at,v_previous+interval '90 minutes');
     if v_candidate<=v_meal_end and v_candidate>v_task.scheduled_at+interval '30 seconds' then
       update public.care_daily_checklist set scheduled_at=v_candidate where id=v_task.id;
       insert into public.care_activity_log
         (owner_id,patient_id,task_id,category,event_type,scheduled_at,happened_at,recorded_at,actor_id,source,details)
       values(v_task.owner_id,p_patient_id,v_task.id,'refeicao','rescheduled',v_task.scheduled_at,
         null,v_now,auth.uid(),'adaptive_consumption_replan',
         jsonb_build_object('title',v_task.title,'previous_scheduled_at',v_task.scheduled_at,
           'next_scheduled_at',v_candidate,'kind',p_kind,
           'reason','minimum_reminder_gap_after_meal','gap_minutes',90));
       v_meals_changed:=v_meals_changed+1;
     else v_candidate:=v_task.scheduled_at;
     end if;
     v_previous:=v_candidate;
   end loop;
 end if;
 -- Recompute volumes after the final schedule, without counting other beverages as water.
 if v_goal is null or v_restrict then
   delete from public.care_hydration_suggested_portions s
     where s.patient_id=p_patient_id and exists(
       select 1 from public.care_daily_checklist t
       where t.id=s.task_id and t.category='hidratacao'
       and (t.scheduled_at at time zone 'America/Rio_Branco')::date=v_day
     );
 else
   select count(*) into v_count from public.care_daily_checklist t
    where t.patient_id=p_patient_id and t.category='hidratacao'
     and t.completed_at is null and t.scheduled_at>v_now and t.scheduled_at<v_cutoff
     and (t.scheduled_at at time zone 'America/Rio_Branco')::date=v_day
     and not exists(select 1 from public.care_hydration_responses h where h.task_id=t.id and h.response='not_drunk')
     and not exists(select 1 from public.care_task_resolutions r where r.task_id=t.id);
   v_per_slot:=case when v_count=0 or v_remaining=0 then 0
        else least(350,greatest(10,ceil(v_remaining::numeric/v_count)::int)) end;
   insert into public.care_hydration_suggested_portions
      (task_id,patient_id,owner_id,suggested_ml,target_ml,consumed_ml,remaining_ml,reason,recalculated_at)
   select t.id,p_patient_id,v_owner,v_per_slot,v_goal,v_water_total,v_remaining,
      case when v_remaining=0 then 'meta_atingida'
           when v_remaining>v_count*350 then 'restante_supera_capacidade'
           else 'distribuicao_organizacional' end,v_now
   from public.care_daily_checklist t
   where t.patient_id=p_patient_id and t.category='hidratacao' and t.completed_at is null
    and t.scheduled_at>v_now and t.scheduled_at<v_cutoff
    and (t.scheduled_at at time zone 'America/Rio_Branco')::date=v_day
    and not exists(select 1 from public.care_hydration_responses h where h.task_id=t.id and h.response='not_drunk')
    and not exists(select 1 from public.care_task_resolutions r where r.task_id=t.id)
   on conflict(task_id) do update set suggested_ml=excluded.suggested_ml,
     target_ml=excluded.target_ml,consumed_ml=excluded.consumed_ml,remaining_ml=excluded.remaining_ml,
     reason=excluded.reason,recalculated_at=excluded.recalculated_at;
 end if;
 return jsonb_build_object('hydration_rescheduled',v_changed,
   'meals_rescheduled',v_meals_changed,'target_ml',v_goal,'consumed_ml',v_water_total,
   'remaining_ml',case when v_goal is null then null else v_remaining end,
   'suggested_ml',case when v_goal is null or v_count=0 then null else v_per_slot end,
   'as_of',v_now,'time_zone','America/Rio_Branco');
end $function$
;