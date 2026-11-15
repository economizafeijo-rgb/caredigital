# NextVita Public Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Open free public registration with email confirmation, validated identity data, automatic first-access onboarding, and a professional home banner.

**Architecture:** Use Supabase Auth `signUp` with temporary registration metadata, then bootstrap the private profile and patient records after the confirmed first login. Add a protected identity table for normalized CPF and phone, with idempotent client-side onboarding and existing RLS patterns.

**Tech Stack:** React 19, TanStack Router, Supabase JS, PostgreSQL migrations, Tailwind CSS 4, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-15-public-signup-nextvita-design.md`

## Global Constraints

- Registration is free and open to visitors.
- Email confirmation is required before the first access.
- CPF, phone, email, and birth date require format or verifier validation.
- Existing login, recovery, records, and RLS behavior must continue working.
- Temporary metadata is never used for authorization.
- The first-access bootstrap must be idempotent.

## Review Focus

- Invalid CPF with a wrong verifier must be rejected by the form and never sent.
- Brazilian phone numbers with punctuation and country code must normalize consistently.
- A future birth date must be rejected.
- Repeated first login must not create duplicate patient, access, identity, or body-measurement rows.
- Duplicate CPF must show a user-facing error without exposing another account.

### Task 1: Validation utilities

**Files:**
- Create: `src/lib/public-signup-validation.ts`
- Test: `src/lib/public-signup-validation.test.ts`

**Interfaces:**
- Produce `normalizeCpf`, `isValidCpf`, `normalizeBrazilPhone`, `isValidBrazilPhone`, `isValidBirthDate`.

- [ ] Add failing tests for valid and invalid CPF, phone, and birth dates.
- [ ] Implement deterministic normalization and verifier checks.
- [ ] Run the focused Vitest file.

### Task 2: Database identity storage

**Files:**
- Create: `supabase/migrations/20261115190000_public_signup_identity.sql`

**Interfaces:**
- Create `public.care_identity_profiles` with `user_id`, `cpf`, `phone`, timestamps, unique CPF, RLS owner policy, and authenticated grants.
- Add an index for normalized CPF lookup.
- [ ] Apply the migration to the linked Supabase project.
- [ ] Query the catalog and policies to verify the table.

### Task 3: First-access bootstrap

**Files:**
- Create: `src/lib/public-signup-bootstrap.ts`
- Test: `src/lib/public-signup-bootstrap.test.ts`
- Modify: `src/routes/entrar.tsx`

**Interfaces:**
- Implement `bootstrapPublicSignup(user: User): Promise<{ patientId: string }>`.
- Upsert `care_profiles`, find or create the owner patient, upsert identity data, create self access, and insert the first body measurement once.
- [ ] Add tests for metadata parsing and idempotent decisions.
- [ ] Call bootstrap after a confirmed password login and route the user to `/cliente`.
- [ ] Map duplicate CPF and confirmation errors to safe messages.

### Task 4: Public registration interface

**Files:**
- Modify: `src/routes/entrar.tsx`

**Interfaces:**
- Add `signup` mode and fields for name, email, password, password confirmation, CPF, phone, birth date, weight, and height.
- Submit `supabase.auth.signUp` with `emailRedirectTo` and temporary registration metadata.
- [ ] Add client validation and confirmation notice.
- [ ] Add links between login and registration modes.
- [ ] Run route tests and lint.

### Task 5: Free-registration banner

**Files:**
- Modify: `src/routes/index.tsx`

**Interfaces:**
- Add a responsive public banner with “Criar conta grátis” CTA, benefit copy, and NextVita teal identity.
- Display it only for public visitors and preserve authenticated dashboard content.
- [ ] Add a route-level test for the public CTA.
- [ ] Run build, tests, and final static checks.
- [ ] Commit and publish all changes to `main`.
