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
