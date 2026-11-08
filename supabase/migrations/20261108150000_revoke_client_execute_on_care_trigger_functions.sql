-- Trigger functions are invoked by PostgreSQL triggers, not by API clients.
-- Remove inherited PUBLIC and client EXECUTE grants while retaining trusted backend ownership.
REVOKE EXECUTE ON FUNCTION public.care_enforce_task_confirmation_window() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.care_prevent_early_medication() FROM PUBLIC, anon, authenticated;
