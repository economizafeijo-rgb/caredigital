-- CareDigital: corrigir "Fontes parciais — alimentos" no histórico do cliente.
-- Contexto: care_meal_details tinha RLS habilitado, mas não possuía política SELECT
-- e não concedia SELECT ao papel authenticated, impedindo leitura dos alimentos.
-- Somente o responsável ou o cliente com vínculo ativo pode ler as descrições.
-- Preserva as demais permissões e os registros existentes.
BEGIN;
ALTER TABLE public.care_meal_details ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON TABLE public.care_meal_details TO authenticated;

DROP POLICY IF EXISTS "meal details read owner or authorized patient"
  ON public.care_meal_details;
CREATE POLICY "meal details read owner or authorized patient"
ON public.care_meal_details
FOR SELECT TO authenticated
USING (
  owner_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.care_patient_access AS a
    WHERE a.patient_id = care_meal_details.patient_id
      AND a.owner_id = care_meal_details.owner_id
      AND a.user_id = (SELECT auth.uid())
  )
);
COMMIT;

-- Conferência: RLS ativo; SELECT somente para authenticated.
SELECT c.relrowsecurity AS rls_on,
  has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select,
  has_table_privilege('anon',c.oid,'SELECT') AS anonymous_select
FROM pg_class AS c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='care_meal_details';
