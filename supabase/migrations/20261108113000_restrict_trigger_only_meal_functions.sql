-- Trigger-only SECURITY DEFINER functions must not be directly callable through PostgREST.
-- PostgreSQL executes trigger functions as part of the triggering statement; callers do not
-- need EXECUTE on the trigger function itself.
revoke execute on function public.care_align_recorded_meal_type() from public, anon, authenticated;
revoke execute on function public.care_match_unscheduled_meal() from public, anon, authenticated;
revoke execute on function public.care_recalculate_after_extra_meal_log() from public, anon, authenticated;
