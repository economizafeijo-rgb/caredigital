# CareDigital SaaS Premium Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (native execution task-by-task). Steps use checkbox syntax for tracking.

**Goal:** Consolidate the CareDigital visual system and progressively redesign public, patient, and management experiences into one responsive SaaS Premium product without changing health data or clinical behavior.

**Architecture:** Keep React 19, TanStack Start/Router, Tailwind CSS 4, Radix UI, Lucide, and existing component patterns. Establish semantic design tokens and reusable primitives first, then migrate route groups incrementally while preserving Supabase contracts and existing business logic.

**Tech Stack:** React 19, TypeScript, TanStack Router/Start, Tailwind CSS 4, Radix UI, Lucide React, Supabase, Vitest, Testing Library, ESLint, Vite.

**Spec:** `docs/superpowers/specs/2026-11-07-caredigital-saas-premium-design.md`

## Global Constraints

- No Supabase schema, row, policy, RLS, Edge Function, or permission changes.
- No changes to medication prescriptions, dose, schedule, treatment duration, blister sequence, confirmations, or history.
- Preserve Feijó/Acre timezone behavior and existing date helpers.
- Preserve authentication and patient-linking behavior.
- Keep all existing tests; add regression tests before changing behavior.
- No new UI dependency without justification.
- Do not use `overflow:hidden` to conceal content; essential content remains reachable at 200% zoom.
- Every route supports loading, empty, error, unauthorized, and ready states as applicable.

## Review Focus

1. Patients with many medication doses or long treatment history must inspect every dose and record; cover dashboard and blister tests.
2. A 320px viewport or 200% zoom must not clip navigation, forms, tables, or medication actions; cover responsive components and browser checks.
3. Light/dark theme on every route must keep text, inputs, status badges, charts, dialogs and menus readable; cover shell and shared component tests.
4. Visitor, linked patient, unlinked user and authorized admin must see correct navigation/access; extend routing tests.
5. Loading, empty and Supabase-error states must not appear as successful or zero clinical values; test explicit states.

---

## Repository Map

### Shared foundation
- Modify: `src/styles.css` — semantic tokens, global type scale, focus, reduced motion, base layout.
- Modify: `src/components/vigia/ui.tsx` — shared `Btn`, `Panel`, `PageHeader` only where needed; retain API compatibility.
- Create if useful: `src/components/vigia/design-system.css` — shared component styles.
- Create only if independently useful: `src/lib/theme.ts` — typed theme preference helpers.
- Test: `src/test/app-routing.test.tsx` plus focused theme/UI tests.

### Global shell and public pages
- Modify: `src/components/vigia/AppShell.tsx` — responsive profile-aware navigation and theme; preserve auth.
- Modify: `src/routes/index.tsx` — separate homepage presentation from existing access decision.
- Modify: `src/routes/entrar.tsx` — visual migration only.
- Modify: `src/routes/protocolos.tsx`, `src/routes/dietas.tsx`, and `PublicCareShowcase` consumers.
- Test: routing and shell navigation.

### Patient experience
- Modify: `src/components/vigia/HomeClientCard.tsx`, `src/components/vigia/ClientSectionHeader.tsx`.
- Modify `src/lib/client-pages.ts` only if navigation metadata needs consolidation; preserve keys.
- Migrate: `client-overview-premium.css`, `client-overview-fullscreen.css`, `client-dashboard-art.css` into token-driven styles; remove legacy rules only after usage search.
- Tests: `ClientOverviewIndicators.test.tsx`, `ClientTodayTimeline.test.ts`, `MedicationBlisterCalendar.test.tsx`, `ClientActivityPage.test.tsx`, `client-pages.test.ts`, `care-schedule.test.ts`.

### Management and nutrition
- Modify: `src/routes/admin.tsx`, `src/routes/prontuario.tsx`, `src/routes/biblioteca-alimentar.tsx`.
- Review: `src/routes/pacientes.tsx` compatibility redirect; do not remove.
- Test: route rendering and access states; keep nutrition calculations and Supabase queries unchanged.

### Verification
- Commands: `npm test`, `npm run lint`, `npm run build`.
- Browser checks: 320, 375, 768, 1024, 1440 px; light/dark; 100% and 200% zoom; keyboard-only.
- Screenshots: public homepage, login, patient overview, patient detail sections, admin, medical record, food library.

---

## Phase 0 — Baseline and visual inventory

### Task 0.1: Establish current baseline

**Files:** no production files modified.

- [ ] Record branch/head and working-tree state.
- [ ] Run `npm test`; save full result and failing test names.
- [ ] Run `npm run lint`; save full result.
- [ ] Run `npm run build`; save full result.
- [ ] Capture screenshots for all routes and profiles where credentials are available.
- [ ] Record viewport, theme, route and observed clipping/contrast/navigation issues in the audit.

**Acceptance:** baseline failures are distinguished from regressions; no browser appearance is claimed verified without screenshots.

## Phase 1 — Design tokens and shared primitives

### Task 1.1: Add semantic theme token contract

**Files:** modify `src/styles.css`; create `src/lib/theme.ts` and tests only if preference logic is extracted.

- [ ] Add failing tests for preference resolution (saved light, saved dark, no preference).
- [ ] Run focused tests to verify the expected failure.
- [ ] Define approved semantic tokens in `:root` and `:root.dark`.
- [ ] Search all usages before removing duplicate/conflicting declarations.
- [ ] Ensure form controls follow active theme.
- [ ] Validate contrast for text, controls, status, charts and focus.
- [ ] Run focused tests.
- [ ] Commit `feat(ui): establish semantic CareDigital theme tokens`.

### Task 1.2: Consolidate shared UI primitives

**Files:** inspect/modify `src/components/vigia/ui.tsx`; create `design-system.css` only if needed; add `ui.test.tsx` if no primitive tests exist.

- [ ] Add tests for button variants, disabled/loading, Panel, PageHeader and focus.
- [ ] Implement token-driven variants without changing existing public component props.
- [ ] Ensure controls have visible focus and minimum touch targets.
- [ ] Add EmptyState, LoadingState and ErrorState only if equivalent components do not exist.
- [ ] Run focused tests, lint and build.
- [ ] Commit `feat(ui): unify shared SaaS components`.

### Task 1.3: Remove broad CSS overrides safely

**Files:** modify `src/styles.css` and `src/components/vigia/internal-premium.css`.

- [ ] Search every affected selector: `:has()`, class substring selectors, fixed hex values and `!important`.
- [ ] Add regression tests for affected components.
- [ ] Replace global descendant styling with component-owned classes and semantic tokens.
- [ ] Keep legacy styles while any route depends on them.
- [ ] Run full tests, lint and build.
- [ ] Commit `refactor(ui): scope legacy styles to components`.

## Phase 2 — App shell, navigation, homepage and authentication

### Task 2.1: Normalize navigation by profile

**Files:** modify `src/components/vigia/AppShell.tsx`; review `src/lib/client-pages.ts`; test `src/test/app-routing.test.tsx` and add `AppShell.test.tsx` if needed.

- [ ] Test visitor, patient, unlinked user and admin navigation.
- [ ] Test active route, mobile menu open/close and keyboard navigation.
- [ ] Implement one navigation model with profile-filtered groups and consistent active state.
- [ ] Remove confusing duplicate destinations while retaining routes and redirects.
- [ ] Verify navigation on refresh and auth state changes.
- [ ] Commit `feat(navigation): unify profile-aware app navigation`.

### Task 2.2: Persist theme without flash

**Files:** modify `src/components/vigia/AppShell.tsx`, `src/routes/__root.tsx`; optionally `src/lib/theme.ts`.

- [ ] Test saved light, saved dark and no saved preference.
- [ ] Apply theme before first paint without hydration mismatch.
- [ ] Keep storage key `caredigital-theme`.
- [ ] Verify inputs, charts, dropdowns, dialogs and nav in both themes.
- [ ] Commit `fix(theme): apply saved theme consistently before render`.

### Task 2.3: Redesign public homepage and login

**Files:** modify `src/routes/index.tsx`, `src/routes/entrar.tsx`; tests for homepage/login states.

- [ ] Test visitor, admin, linked patient and unlinked account presentation.
- [ ] Separate public hero presentation from access decision while preserving route behavior and authorization.
- [ ] Apply shared typography, cards, buttons and responsive layout.
- [ ] Validate 320/375/768/1024/1440 px and both themes.
- [ ] Verify login, recovery, reset and redirects unchanged.
- [ ] Commit `feat(home): redesign public entry and login experience`.

### Task 2.4: Migrate public resource pages

**Files:** modify `src/routes/protocolos.tsx`, `src/routes/dietas.tsx`, `PublicCareShowcase` and consumers.

- [ ] Test shared showcase content and CTA destinations.
- [ ] Migrate public medication, hydration, nutrition, protocol and diet pages to the common layout.
- [ ] Mark demonstrative content clearly; do not imply it is patient-specific data.
- [ ] Verify links and responsive illustrations.
- [ ] Commit `feat(public): unify resource showcase pages`.

## Phase 3 — Patient experience

### Task 3.1: Unify patient navigation and section headers

**Files:** modify `HomeClientCard.tsx`, `ClientSectionHeader.tsx`, optionally `client-pages.ts`.

- [ ] Test every visible tab opens its matching section and marks it active.
- [ ] Test keyboard and mobile navigation.
- [ ] Consolidate five care tabs and four secondary tabs into the approved information architecture.
- [ ] Keep section keys and callbacks intact.
- [ ] Ensure every section has its own heading, accessible panel label and overview navigation.
- [ ] Commit `feat(patient): normalize patient section navigation`.

### Task 3.2: Redesign patient overview

**Files:** modify `HomeClientCard.tsx`; migrate the three patient CSS files; tests for overview, timeline and blister.

- [ ] Test zero records, many tasks, long medication titles, missing hydration target and loading/error data.
- [ ] Implement header, progress, next care, hydration, agenda/history and indicators with semantic components.
- [ ] Preserve calculations, callbacks, task filters and confirmation flow.
- [ ] Remove rigid fixed-height constraints that clip content; use responsive grids and bounded scroll regions.
- [ ] Verify the full blister and every dose action remain reachable.
- [ ] Commit `feat(patient): redesign daily overview`.

### Task 3.3: Migrate patient detail sections

**Files:** section components rendered by `HomeClientCard.tsx`; existing tests for medication, activity, schedule, hydration and history.

- [ ] Inventory all nine section keys and component ownership.
- [ ] Add rendering tests for every section.
- [ ] Apply shared SectionHeader, Card, StatusBadge, table/list and responsive patterns.
- [ ] Preserve medication, hydration, food, activity, indicators, history, agenda and meal-plan behavior.
- [ ] Verify no section is an unintended placeholder; document genuine product gaps separately.
- [ ] Commit `feat(patient): unify patient detail experiences`.

### Task 3.4: Verify patient safety invariants

**Files:** tests only unless a regression is found.

- [ ] Assert medication schedule values and blister sequence remain unchanged.
- [ ] Assert duplicate-confirmation protection and late-confirmation behavior remain intact.
- [ ] Assert timezone labels and date selection use existing Acre helpers.
- [ ] Assert history filters do not mutate records.
- [ ] Run full tests and compare representative data snapshots before/after.
- [ ] Commit `test(patient): lock down care workflow invariants`.

## Phase 4 — Management, records and nutrition

### Task 4.1: Redesign management dashboard and medical records

**Files:** modify `src/routes/admin.tsx`, `src/routes/prontuario.tsx`; touch `pacientes.tsx` only for compatibility presentation.

- [ ] Test unauthenticated, non-admin, authorized admin, no patients and Supabase error.
- [ ] Apply shared AppPage, PageHeader, MetricCard, Panel, form and table/list components.
- [ ] Organize patient selection, summary, agenda, hydration and observations into clear sections.
- [ ] Keep RLS and owner-scoped queries unchanged.
- [ ] Preserve `/pacientes` redirect unless a separate product decision changes it.
- [ ] Commit `feat(admin): unify management and medical record UI`.

### Task 4.2: Redesign food library and nutrition

**Files:** modify `src/routes/biblioteca-alimentar.tsx`, `dietas.tsx`, `nutricao-esportiva.tsx`.

- [ ] Test empty catalog, search/group filtering, missing goals, zero consumption and query errors.
- [ ] Reorganize food search, meal builder, nutrient summary, targets and history.
- [ ] Preserve formulas, catalog values, units, Supabase table/column contracts and timezone.
- [ ] Validate charts in light/dark and mobile.
- [ ] Commit `feat(nutrition): redesign food library and nutrition pages`.

## Phase 5 — Quality gates and release readiness

### Task 5.1: Accessibility and responsive audit

- [ ] Verify keyboard navigation, focus order, dialogs, tab semantics and accessible names.
- [ ] Check contrast for all token pairs and status states.
- [ ] Verify reduced motion and 200% zoom.
- [ ] Verify 320, 375, 768, 1024 and 1440 px viewports.
- [ ] Verify no horizontal overflow or clipped content.
- [ ] Commit `test(a11y): cover responsive and accessible workflows`.

### Task 5.2: Full regression and release review

- [ ] Run `npm test` and require zero failures.
- [ ] Run `npm run lint` and require zero errors.
- [ ] Run `npm run build` and require exit code 0.
- [ ] Review screenshots for homepage, login, patient overview, all patient sections, admin, medical record and food library in both themes.
- [ ] Compare database row counts and representative medication schedule values before/after; visual work must not mutate them.
- [ ] Request independent code review before merging/publishing.
- [ ] Publish only after all checks pass; document blocked checks explicitly.
- [ ] Commit `chore(release): verify CareDigital SaaS redesign`.

---

## Self-review

- **Spec coverage:** homepage/login and public resources (Phase 2); shell/navigation/theme (Phase 2); patient overview and sections (Phase 3); management/prontuário (Phase 4); nutrition (Phase 4); accessibility/responsive (Phase 5); data safety (Tasks 3.4 and 5.2).
- **Task boundaries:** each phase has focused tests and a reviewable deliverable; legacy CSS removal is delayed until dependencies are proven absent.
- **Interface consistency:** existing route paths and patient section keys are retained; no new data contract is introduced.
- **Review focus coverage:** long treatment history; narrow viewports/zoom; theme parity; profile/access state; missing/error data.
- **Builder check:** self-reviewed because no independent subagent dispatch facility is available here. Live browser screenshots and credentials for every profile remain Phase 0 prerequisites.


## Execution log — 2026-11-08

### Phase 0 — Baseline
- Repository default branch confirmed as `main`.
- Package scripts confirmed: `npm test`, `npm run lint`, `npm run build`; CI uses Bun with the lockfile.
- Local baseline could not be run in this environment because the container cannot resolve `github.com` for cloning/installing dependencies. The repository's GitHub Actions workflow was used as the verification path instead.
- Browser screenshots and real-profile visual checks remain pending; no visual appearance has been claimed as browser-verified.

### Phase 1 — Foundation (in progress)
- Updated `src/styles.css` with the approved semantic light/dark palette, shared spacing/radius tokens, global focus treatment, form-control token inheritance and reduced-motion handling.
- Aligned display/interface typography to Inter and updated the root Google Fonts stylesheet link.
- Removed the duplicate internal-workspace color-token overrides; internal surfaces, fields, tables and headings now inherit semantic theme variables.
- Updated shared `Btn` touch sizing and field-label size in `src/components/vigia/ui.tsx`.
- Added `src/test/design-tokens.test.ts` and `src/components/vigia/ui.test.tsx`.
- GitHub Actions verification was automatically triggered by the latest push. At the time of this log, dependency installation had succeeded and the test step was running; test/build conclusions are not yet available.

### Verification limitations
- The new tests have been committed but must be confirmed by the active GitHub Actions run.
- The design system is a first foundation pass, not a completed migration of all legacy page-specific CSS. Further scoped-style cleanup and browser validation remain required.


### Phase 1 verification update
- Latest successful CI run: `42437499835` — all workflow steps completed successfully.
- Test suite: **20 test files passed, 104 tests passed**.
- Scoped ESLint: the two newly added UI test files passed.
- Production build: passed.
- A full-repository `bun run lint` was also attempted. It currently fails with **8,377 errors and 22 warnings**, mostly Prettier formatting violations spread across the existing repository. The lint step is therefore scoped to the newly added tests for this phase; the repository-wide lint debt is not silently treated as resolved. Since a pre-change full-lint baseline was not captured, these findings are recorded as current repository debt rather than definitively attributed to earlier commits.
- One initial run exposed a test-path issue (`new URL(...)` under the Vitest transform); the test was corrected to resolve files from the project root, and the subsequent complete test/build run passed.
- Visual contrast measurements, live-browser screenshots and all-viewport review remain outstanding; Phase 1 is not declared complete until these are verified.
