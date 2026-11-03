-- Consolidate legacy reflow paths: AFTER triggers already reschedule
-- once for each saved intake. Keeping the legacy delta shift would change
-- patient reminders twice after a late meal/water confirmation.
create or replace function public.care_reflow_pending_schedule(
 p_patient_id uuid,p_category text,p_previous_time timestamptz,p_confirmed_time timestamptz)
 returns integer language plpgsql set search_path=public,pg_temp as $$
begin
 if p_patient_id is null or p_category not in ('hidratacao','refeicao') then return 0; end if;
 -- The secure AFTER UPDATE / INSERT triggers already ran the adaptive planner.
 -- Historical RPC signature remains compatible with existing clients.
 return 0;
end $$;

create or replace function public.care_reflow_after_extra_water(
 p_patient_id uuid,p_consumed_at timestamptz,p_min_gap_minutes integer default 45)
 returns integer language plpgsql set search_path=public,pg_temp as $$
begin
 if p_patient_id is null or p_consumed_at is null
    or p_min_gap_minutes not between 15 and 120 then
   raise exception 'Invalid reminder recalculation';
 end if;
 -- The AFTER INSERT care_hydration trigger already recalculated water timing
 -- with the actual recorded volume and daily remaining target.
 return 0;
end $$;

create index if not exists care_food_consumptions_food_idx
 on public.care_food_consumptions(food_id);
