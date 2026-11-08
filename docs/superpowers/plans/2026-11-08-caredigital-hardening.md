# CareDigital Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the existing CareDigital patient experience and Supabase integration while preserving every existing patient record and treatment workflow.

**Architecture:** Incremental audit-driven changes across React/TypeScript UI and Supabase/Postgres. Each slice is independently tested; database permission changes are limited to verified least-privilege corrections.

**Tech Stack:** React 19, TypeScript, TanStack Router, Tailwind CSS, Supabase/Postgres, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-08-caredigital-hardening-design.md`

## Global Constraints
- No patient history deletion or rewriting.
- No changes to medication doses, prescriptions, or scheduled treatment times.
- No fabricated patient data.
- Use America/Rio_Branco for client-local date/time.
- Work on `main` as explicitly authorized.
- Full Vitest suite and production build are required for each completed slice.

## Review Focus
- Unauthenticated access to trigger functions must be denied while trigger execution remains functional.
- Authenticated users must not access another patient's data through RPC arguments.
- Empty or missing records must not be rendered as zero-valued fabricated history.
- Day boundaries around midnight in Acre must not shift records to adjacent dates.
- Dark mode and narrow screens must retain readable contrast and reachable actions.

---

### Task 1: Restrict trigger-only SECURITY DEFINER functions

**Files:**
- Create: `supabase/migrations/20261108113000_restrict_trigger_only_meal_functions.sql`
- Test: SQL privilege assertions against the live Supabase project.

**Interfaces:**
- Consumes: existing trigger functions `care_align_recorded_meal_type()`, `care_match_unscheduled_meal()`, `care_recalculate_after_extra_meal_log()`.
- Produces: same trigger behavior with direct EXECUTE denied to PUBLIC, anon, and authenticated.

- [x] Inspect definitions and confirm all three are trigger functions.
- [x] Revoke direct EXECUTE grants without changing trigger definitions.
- [x] Verify anon/authenticated cannot execute and trigger attachments still exist (SQL query: all three have anon_exec=false, auth_exec=false, attached_triggers=1).

### Task 2: Audit patient-facing menu and page data contracts

**Files:**
- Inspect: `src/components/vigia/HomeClientCard.tsx`
- Inspect: `src/components/vigia/ClientActivityPage.tsx`
- Inspect: `src/components/vigia/ClientOverviewIndicators.tsx`
- Inspect: `src/lib/client-pages.ts`
- Tests: existing `*.test.tsx` and `*.test.ts` plus focused regressions.

**Interfaces:**
- Consumes: existing ClientSection hash map and patient/owner identifiers.
- Produces: verified mapping from each menu to its own page and patient-scoped query.

- [x] Trace menu click, URL hash, browser back/forward, and page rendering paths; all nine sections have unique hashes and individual conditional page renderers.\n- [x] Add regression test for malformed percent-encoded hashes; observed RED in CI (run 42432583929), added safe fallback to the overview, then GREEN in full CI (run 42432618684).
- [ ] Verify loading, empty, error, and populated states for each page.
- [ ] Add failing regression tests for any confirmed navigation/data defect before fixing it.
- [x] Run full suite and production build: GitHub Actions run 42432618684 completed successfully.

### Task 3: Review Supabase authorization and RLS

**Files:**
- Inspect: all SECURITY DEFINER RPCs, policies, table grants, and relevant migrations.
- Create: additive migration only for confirmed authorization defects.

**Interfaces:**
- Consumes: current Supabase schema and auth.uid()-based ownership/access relationships.
- Produces: explicit least-privilege grants and RLS policies that preserve intended admin/client access.

- [x] Initial static authorization review of all 26 authenticated SECURITY DEFINER overloads: all require an authenticated UID, use a fixed `search_path` (`public`, `pg_temp`), and include owner or `care_patient_access` scoping checks. Inspected representative write/read flows in detail; no blanket EXECUTE revocations were made because these are intentional patient workflows.\n- [ ] Complete adversarial cross-patient tests for every RPC family before declaring this review closed.
- [ ] Determine intended access to care_hydration_goal_targets before adding any policy.
- [ ] Add privilege/RLS regression assertions.
- [ ] Apply only verified restrictive changes and confirm existing authenticated workflows remain available.

### Task 4: Correct database query performance safely

**Files:**
- Inspect: foreign-key definitions, query patterns, RLS policies, indexes.
- Create: additive index/policy migration only where query plans and access semantics support it.

**Interfaces:**
- Consumes: advisor findings and current application query patterns.
- Produces: indexes for demonstrated FK/query paths and optimized auth initplans.

- [x] Compared every public foreign-key constraint with valid leading-column indexes. Twelve FK constraints currently lack a matching leading index; this is not yet a mandate to add indexes.\n- [ ] Map the twelve candidates to actual query plans, table sizes, and delete/update paths before choosing indexes.
- [ ] Do not remove unused indexes without production-scale evidence.
- [ ] Add only non-duplicative indexes and safe policy expression optimizations.
- [ ] Verify advisor changes and run regression checks.

### Task 5: Patient UI accessibility and responsive/dark-mode audit

**Files:**
- Inspect: `src/components/vigia/client-overview-premium.css`
- Inspect: `src/components/vigia/client-overview-fullscreen.css`
- Inspect: `src/components/vigia/internal-premium.css`
- Inspect: `src/components/vigia/HomeClientCard.tsx`
- Tests: component tests and visual/manual desktop/mobile checks.

**Interfaces:**
- Consumes: existing design tokens and theme classes.
- Produces: readable, keyboard-reachable client pages without altering clinical data.

- [ ] Inspect each page in desktop and mobile layouts.
- [ ] Check dark/light contrast, overflow, focus states, and long content.
- [ ] Add regression tests for confirmed layout/interaction defects.
- [ ] Make minimal CSS/component changes and verify.

### Task 6: Final verification and review

- [ ] Run complete Vitest suite.
- [ ] Run production build and lint.
- [ ] Re-run Supabase security and performance advisors.
- [ ] Review changed files and database migration history.
- [ ] Record unresolved external settings or deployment limitations explicitly.


## Auditoria adicional — RLS e advisors (2026-11-08)

- [x] Reconsultados os advisors Supabase de segurança e desempenho.
- [x] As 29 tabelas `care_*` verificadas estão com RLS habilitado.
- [x] Confirmado um caso RLS habilitado sem policy: `care_hydration_goal_targets`. A tabela é acessada pelo fluxo privilegiado `care_sync_hydration_goal`; não foi criada policy permissiva sem validar se clientes devem ler/escrever diretamente.
- [x] Revisadas policies de leitura e acesso delegado nas tabelas de pacientes, checklist, hidratação, histórico, bebidas e concessões.
- [ ] Corrigir a expressão tautológica `p.owner_id = p.owner_id` na policy de leitura de `care_nutrition_meal_logs` após validar a semântica pretendida e criar teste de acesso cruzado.
- [ ] Revisar a policy de leitura de `care_activity_log` que usa `auth.uid()` sem subselect; avaliar também as policies com múltiplas permissões SELECT.
- [ ] Advisor atual: 11 FKs sem índice correspondente (a contagem anterior de 12 era uma superestimativa). A maioria das tabelas relacionadas tem poucas linhas neste momento; avaliar crescimento e planos de consulta antes de adicionar índices.
- [ ] Advisor aponta 11 índices não utilizados; não remover sem histórico representativo de uso e validação de consultas.
- [ ] Há 26 avisos para SECURITY DEFINER executáveis por authenticated; são RPCs do cliente com verificações internas. Não revogar em massa. Continuar teste adversarial por função.
- [ ] Habilitar proteção contra senhas vazadas no Auth via configuração do projeto, após revisão da configuração operacional.
- [ ] Criar testes automatizados de isolamento por dois usuários e dois pacientes para cada família de RPC e policy. Não foi possível provar esse isolamento apenas com consultas administrativas; nenhuma alegação de teste adversarial concluído.


## Incremental policy hardening (2026-11-08)

- [x] Removed the tautological `p.owner_id = p.owner_id` from `care_nutrition_meal_logs` SELECT policy. Owner access and explicit delegated access predicates remain intact.
- [x] Compared old and new meal-log policy predicates for every current meal log and owner/delegate actor: 0 behavior differences across 2 comparisons (small live dataset).
- [x] Optimized `care_activity_log` SELECT policy to use `(select auth.uid())` for statement-level evaluation, preserving owner/delegate predicate logic.
- [x] Compared activity-log access predicates across current log/owner/delegate combinations: 0 differences across 628 comparisons.
- [ ] Wait for CI on latest main commit to complete; tests/build are still running at the time of this note.
- [ ] Continue RLS audit: body-measurement policies also contain tautological self-comparisons; inspect and test read/insert/update semantics before changing them.
- [ ] Revisit the 7 auth initplan advisor findings after these changes and determine which remaining policy definitions are genuinely affected.


## Body-measurement RLS hardening (2026-11-08)

- [x] Inspected SELECT, INSERT, and UPDATE policies on `care_body_measurements`.
- [x] Replaced tautological parent-owner comparisons with `care_patients.owner_id = care_body_measurements.owner_id` in all three policies.
- [x] Preserved owner access and explicit `care_patient_access` delegation; INSERT/UPDATE still require `recorded_by = (select auth.uid())`.
- [x] Checked current data before applying: table had 0 rows, 0 orphaned patient references, 0 owner mismatches; no patient records were modified.
- [x] Applied and re-read the live policies to confirm the intended owner binding.
- [ ] Run dedicated authenticated two-owner/delegate integration tests; current admin SQL inspection is not a substitute for end-user JWT/RLS tests.
- [ ] Await CI for commit `ebc77f8` before marking code verification complete.


## Index review and query-plan validation (2026-11-08)

- [x] Confirmed CI success for body-measurement RLS migration commit `ebc77f8` and plan update `fa9d597`.
- [x] Reconciled actual FK constraints with valid leading-column indexes. Nine FK constraints are not covered by a matching child-side index; advisor reports 11 findings (the advisor's count is retained as authoritative for its own rules).
- [x] Inspected live table statistics. Current tables are small (largest observed: `care_activity_log` 314 rows, `care_daily_checklist` 208 rows, `care_hydration` 44 rows).
- [x] Ran EXPLAIN ANALYZE on the real patient/time checklist access pattern. PostgreSQL uses `care_checklist_patient_schedule`; execution was 0.046 ms with 2 shared buffers. A new index is not justified by this plan.
- [x] No speculative indexes added. This avoids write overhead and duplicate index storage for low-volume tables.
- [ ] Revisit indexes after meaningful data growth or when representative production query plans show sequential scans with material cost.
- [ ] Next focus: validate authenticated RLS isolation using dedicated JWT-based integration tests; admin SQL comparisons are not sufficient.


## Read-isolation smoke tests under authenticated role (2026-11-08)

- [x] Executed read-only SQL transactions using `SET LOCAL ROLE authenticated` and simulated JWT subject claims; each transaction rolled back.
- [x] Patient owner sees the linked patient and current rows: 1 patient, 208 checklist rows, 44 hydration rows, 314 activity rows, 1 nutrition meal-log row.
- [x] Unrelated authenticated UUID sees 0 rows in all five datasets.
- [x] Explicitly delegated user sees the linked patient and the same permitted rows: 1 patient, 208 checklist rows, 44 hydration rows, 314 activity rows, 1 nutrition meal-log row.
- [ ] These are read-isolation smoke tests against the current live data, not a full adversarial suite. Need add automated JWT integration tests for attempted writes, cross-patient RPC calls, revoked grants, and a second unrelated real patient.
- [ ] The current project contains only one patient record and one explicit patient-access grant, limiting the available cross-owner fixtures.


## RPC write-boundary smoke tests and SECURITY DEFINER review (2026-11-08)

- [x] Ran transactional RPC checks under `SET LOCAL ROLE authenticated` with simulated unrelated and explicitly delegated JWT subjects; transaction rolled back.
- [x] Unrelated authenticated user calling `care_confirm_task` for the patient's pending hydration task was rejected as unavailable.
- [x] Unrelated authenticated user calling `care_correct_water_entry` for the patient's water row was rejected as unavailable.
- [x] Delegated user reached the existing completed-task guard in `care_confirm_task` (the function recognized the authorized task, then rejected it because it was already completed).
- [x] Delegated user called `care_correct_water_entry` with the current amount (no-op); the function returned the same amount.
- [x] Post-check confirmed pending hydration task, water amount, and completed meal task were unchanged.
- [x] Reviewed all public SECURITY DEFINER functions: authenticated RPC entry points are not granted to `anon`; trigger/internal helpers without an `auth.uid()` check are not executable by `authenticated` or `anon`. User-facing RPCs inspected include explicit owner or patient-access checks.
- [x] `care_hydration_goal_targets` has RLS enabled and no policies, but neither `anon` nor `authenticated` has table privileges; it is currently inaccessible through the public Data API. No broad policy was added.
- [ ] Supabase Security Advisor still reports the expected warning for 26 authenticated-callable SECURITY DEFINER functions. Keep reviewing each public RPC and consider moving internal helpers to a non-exposed schema in a separate migration after dependency mapping.
- [ ] Expand automated integration coverage with a second unrelated real patient, attempted writes, access revocation, and cross-patient RPC IDs. Current live project only has one patient and one access grant.
- [ ] Do not revoke authenticated EXECUTE globally or switch every SECURITY DEFINER function to SECURITY INVOKER without dependency review; several functions are intentional public RPC entry points and their bodies enforce ownership/access checks.


## Delegated-access revocation test (2026-11-08)

- [x] Confirmed the explicit delegated user had access to the patient and hydration records in the earlier authenticated-role smoke test.
- [x] In a transaction, removed only the delegated user's `care_patient_access` grant, then queried as `authenticated` using that user's JWT subject.
- [x] After revocation, the delegated user's visible patient count was 0 and hydration row count was 0.
- [x] Rolled back the transaction; the actual access grant was not revoked in production.
- [ ] Add a persistent automated integration test with isolated fixtures so grant/revoke behavior remains covered in CI. The current repository has unit tests but no database-auth integration harness configured.


## Medication and treatment integrity audit (2026-11-08)

- [x] Reviewed RLS on `care_medications`: owner-only ALL policy; patient/delegate has no direct access to the owner's medication inventory table.
- [x] Reviewed `care_daily_checklist` medication schedule access: owner can manage own rows; explicitly assigned patient user has SELECT only.
- [x] Authenticated-role smoke tests: owner sees 2 medication inventory rows and 72 scheduled medication tasks; delegated patient user sees 0 medication inventory rows and 72 permitted scheduled medication tasks; unrelated user sees 0 rows in both.
- [x] Checked duplicate medication tasks by patient, owner, category, scheduled timestamp, and title: no duplicate groups in current data.
- [x] Tested delegated user's attempt to confirm a future scheduled medication task through `care_confirm_task`; server rejected with `Care window not started`. Transaction rolled back; no dose was recorded.
- [x] Reviewed database guards: direct checklist insert cannot set `completed_at`; confirmation timestamps are server-controlled; confirmed care records cannot be backdated/altered; medication trigger prevents early confirmation.
- [ ] UI audit finding: `MedicationBlisterCalendar.tsx` currently hardcodes a 35-day display window, phase labels, 84-unit total, schedule start/end dates, and a patient-specific reported-first-blister flag. The component reads actual checklist rows, but the static labels/relato can diverge from live prescription and schedule data. Do not change any prescription or live records; refactor display metadata to derive from verified treatment plan and explicitly persisted patient-reported events after schema/source-of-truth review.
- [ ] Add automated database integration tests for medication owner/delegate/outsider reads, early confirmation rejection, duplicate schedule prevention, and append-only audit history. Existing repo has unit tests but no configured authenticated database integration harness.
- [ ] Review whether protocol admin policies hardcoded to a single email should use a stable admin role/claim instead; do not alter until auth model and administrative users are confirmed.


## Medication calendar UI refactor (2026-11-08)

- [x] Replaced the hardcoded 35-day/84-unit blister presentation with a schedule-driven calendar reading all medication checklist rows for the selected patient (bounded query limit 500).
- [x] Removed patient-specific UUID logic and hardcoded start/end dates, phase lengths, capsule counts, dose quantities, and unpersisted historical dose claims.
- [x] Counts, completion progress, day selection, titles, and times now derive from actual `care_daily_checklist` records; one scheduled task is represented as one care event, without inferring pill counts from labels.
- [x] Kept confirmation connected to the existing `onConfirm` flow and `canConfirmCare` guard; no direct writes or prescription edits were introduced.
- [x] Added empty, loading, and error states; dark-mode surfaces use semantic theme tokens.
- [x] Full Vitest suite and production build passed on commit `e2067d4` (CI run 42435228432). No deployment was triggered from this change.
- [ ] Browser-verify the medication screen on desktop/mobile and compare the rendered rows with live checklist data before treating the UI task as complete.


## Activity-history access audit (2026-11-08)

- [x] Verified `care_activity_log` grants: `authenticated` has SELECT only; INSERT, UPDATE, and DELETE are not granted. `anon` has no table privileges. `service_role` retains full privileges for trusted backend maintenance.
- [x] Verified RLS read policy limits rows to the owner or an explicitly assigned patient user.
- [x] Existing SECURITY DEFINER care RPCs append events for confirmations, corrections, cancellations, and rescheduling; direct authenticated clients cannot rewrite or delete the audit rows.
- [x] No changes made to live activity-log data or permissions.
- [ ] Review privileged service-role access operationally; it is intentionally privileged and must remain server-side only.
- [x] Calendar test matcher correction passed full CI on commit `e2067d4` (94 tests, production build successful).


## Medication history resilience (2026-11-08)

- [x] Changed the calendar query to fetch the newest 500 scheduled medication events first, preventing older rows from occupying the bounded result window and hiding newer treatment records.
- [x] Sort the returned recent events chronologically in memory before rendering, preserving day and dose order.
- [x] Added explicit catch/finally handling so rejected network requests show a recoverable error and always clear the loading state.
- [x] Added regression coverage for descending database order and rejected requests.
- [ ] Await CI run 42435355297 for full tests and production build.
- [ ] Consider keyset pagination if a future patient workflow needs browsing more than the newest 500 medication events; do not silently expand query volume without UX/performance review.
- [ ] Browser-verify long-history behavior and visual layout on desktop/mobile; no browser session or deployment verification has been performed in this slice.


## Hydration profile RLS owner binding (2026-11-08)

- [x] Found tautological `p.owner_id = p.owner_id` predicates in hydration-profile INSERT and UPDATE policy checks.
- [x] Checked existing data before migration: 1 profile row, 0 orphan patient references, 0 owner mismatches.
- [x] Replaced tautology with `care_patients.owner_id = care_hydration_profiles.owner_id` in both write policies; retained owner/delegate authorization predicates and authenticated-only policy scope.
- [x] Applied live Supabase migration `harden_hydration_profile_owner_binding`.
- [x] Re-read live policies and confirmed both now enforce patient-owner equality.
- [x] Executed an authenticated-role transaction attempting to insert a profile for the real patient with a mismatched owner UUID; RLS rejected it. Transaction rolled back and no profile was added.
- [x] Added matching migration file to repository main: `20261108013000_harden_hydration_profile_owner_binding.sql`.
- [x] CI passed for migration commit `b93d824` (GitHub Actions run 42435501146). Supabase migration was applied live and the matching migration file is committed to main.
- [x] Authenticated-role read smoke tests: owner sees 1 profile, assigned delegate sees 1 permitted profile, unrelated user sees 0.
