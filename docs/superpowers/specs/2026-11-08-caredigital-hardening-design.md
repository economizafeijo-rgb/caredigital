# CareDigital hardening and reliability design

## Intent
Improve patient safety, privacy, correctness, and reliability across the existing CareDigital client experience and Supabase backend without disrupting active treatment records or established workflows.

## Goals
- Preserve medication prescriptions, dose counts, scheduled times, and historical records.
- Ensure every client menu opens its own implemented page and presents real, patient-scoped data.
- Protect patient data through least-privilege database access and explicit authorization.
- Improve reliability of date/time handling in the America/Rio_Branco timezone.
- Maintain accessible, responsive light/dark UI and useful loading, empty, and error states.
- Require automated regression coverage for behavior changes.

## Non-goals
- No deletion or rewriting of patient history.
- No medication/dose/prescription changes.
- No fabricated patient, hydration, nutrition, or activity data.
- No broad schema redesign or dependency replacement.
- No deployment without passing verification and confirming the deployment mechanism.

## Constraints
- Existing stack: React 19, TypeScript, TanStack Start/Router, Tailwind CSS, Supabase/Postgres, Vitest.
- Work directly on `main`, as explicitly requested by the project owner.
- Supabase schema changes must be additive/restrictive and preserve existing data.
- Use America/Rio_Branco for patient-local dates and times.
- Run full tests and production build after each coherent implementation slice.

## Approaches
1. Broad rewrite of the client and database: rejected because it risks medication, schedule, and historical data.
2. Focused, evidence-led hardening in independently verifiable slices: selected because it preserves current workflows and allows security fixes to be isolated.
3. UI-only redesign: rejected as insufficient because the live Supabase audit shows security and performance findings.

## Selected approach
Perform an evidence-based audit, then resolve high-confidence security issues first, followed by patient-facing data integrity, navigation, responsive/dark-mode, and performance findings. Each change requires a regression test or a database privilege assertion before implementation.

## Initial evidence and scope
- Current main head at audit start: e8ca12f5a505fa2f7841771aa29a0249df0e768f.
- Latest observed CI run for that head: success.
- Supabase security advisor reports three trigger-only SECURITY DEFINER meal functions executable by anon, one RLS-enabled table with no policies, and leaked-password protection disabled.
- Performance advisor reports 11 unindexed foreign keys, seven RLS initplan findings, and multiple permissive policies on three tables.
- The three trigger-only meal functions were inspected: all are trigger functions, not intended as client RPC endpoints. Their EXECUTE grants were revoked for PUBLIC, anon, and authenticated; trigger behavior remains invoked by PostgreSQL.

## Builder decisions
- Do not blindly revoke EXECUTE from the remaining SECURITY DEFINER RPC functions: many are intentional authenticated workflows and require per-function authorization review.
- Do not add an RLS policy to care_hydration_goal_targets until table purpose, grants, and intended readers/writers are confirmed.
- Do not delete unused indexes based only on a fresh/low-volume database's advisor output.
