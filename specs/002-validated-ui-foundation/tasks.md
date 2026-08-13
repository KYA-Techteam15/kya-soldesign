# Tasks: Validated UI Foundation

**Input**: All artifacts in `specs/002-validated-ui-foundation/`
**Rule**: Execute phases in order. Tests in a phase are written and observed failing before implementation. Run `$ksd-phase-gate` and `pnpm verify:phase` at every checkpoint; never continue on red.

## Format

- `[P]`: may run in parallel because it targets independent files.
- `[USn]`: trace to the user story in `spec.md`.
- Every task names its primary path and verification evidence.

## Phase 1 — Architecture and truthfulness guardrails

**Goal**: Establish the autonomous UI boundary before porting visible code.

- [x] T001 Update `apps/desktop/package.json`, root scripts, and lockfile for React Router and the selected accessibility test dependency; add focused UI test scripts without adding a state framework or persistence library.
- [x] T002 [P] Add failing contract tests for `CapabilityState`, the unavailable-only production calculation adapter, and invalid ready/stale construction in `apps/desktop/test/unit/capability-state.unit.test.ts` (FR-UIBASE-004/005).
- [x] T003 [P] Add failing contract tests for in-memory `ProjectFileV1` creation/update/removal and unknown-id behavior in `apps/desktop/test/integration/project-session.integration.test.ts` (FR-UIBASE-006/008/013).
- [x] T004 [P] Add failing catalog-adapter tests for canonical parsing, deterministic filter/search, provenance, empty result, and parse failure in `apps/desktop/test/integration/catalog-adapter.integration.test.ts` (FR-UIBASE-007/011).
- [x] T005 [P] Add a failing production-boundary scanner and test in `tools/ui/check-production-boundaries.mjs` and `apps/desktop/test/unit/production-boundaries.unit.test.ts` using the forbidden patterns from `source-inventory.md` (FR-UIBASE-003/017).
- [x] T006 Implement `apps/desktop/src/app/contracts.ts`, `ApplicationProvider.tsx`, and focused hooks using the contracts in `contracts/application-ports.md`; keep services app-local and state minimal.
- [x] T007 [P] Implement `apps/desktop/src/app/adapters/inMemoryProjects.ts` against `@ksd/project-format` with an empty initial collection and no browser persistence.
- [x] T008 [P] Implement `apps/desktop/src/app/adapters/canonicalCatalog.ts` through `@ksd/catalog`; React components must not import snapshot JSON.
- [x] T009 [P] Implement `apps/desktop/src/app/adapters/unavailableCalculations.ts`; map each capability to its roadmap owner and expose no numeric output.
- [x] T010 Create `apps/desktop/test/support/createTestServices.ts` with deterministic test-only adapters and prove through T005 that it is absent from the production import graph.
- [x] T011 Run `$ksd-phase-gate` and `pnpm verify:phase`; repair and rerun the full gate up to three cycles. Record command/results under the Phase 1 checkpoint in this file. Do not begin Phase 2 while red.

**Checkpoint evidence**: `corepack pnpm test:ui` (5 tests) and `node tools/ui/check-production-boundaries.mjs` passed; `corepack pnpm verify:phase` passed on 2026-08-11 with 27 unit, 5 property, and 5 data tests. One repair fixed adapter-path normalization in the boundary scanner.

---

## Phase 2 — Approved tokens, bilingual system, primitives, and shell

**Goal**: Deliver the reusable validated visual foundation with complete FR/EN behavior.

- [x] T012 [P] [US2] Add failing key-equality, non-empty-copy, raw-key, and `<html lang>` tests in `apps/desktop/test/unit/i18n.unit.test.ts` and `tools/ui/check-i18n.mjs` (FR-UIBASE-009/010).
- [x] T013 [P] [US5] Add failing keyboard/focus/ARIA tests for dialog, palette, toast region, field errors, tabs, and status primitives in `apps/desktop/test/unit/shared-ui.unit.test.tsx` (FR-UIBASE-014).
- [x] T014 [P] Add the six approved schematic assets under `apps/desktop/src/assets/systems/` and document source commit plus SHA-256 values in `specs/002-validated-ui-foundation/source-inventory.md` (FR-UIBASE-001/002).
- [x] T015 Port the approved `sober` semantic tokens into `apps/desktop/src/styles/tokens.css`, `base.css`, and `utilities.css`; preserve dark-blue text, KYA accents, canvas, density, focus, and reduced-motion tokens; do not port `vivid.css` or `radiant.css` (FR-UIBASE-002/015).
- [x] T016 [US2] Implement typed `fr.ts`, `en.ts`, formatter boundaries, `I18nProvider.tsx`, and locale switch under `apps/desktop/src/shared/i18n/`; migrate every Phase 2 label in both languages (FR-UIBASE-009/010).
- [x] T017 [US4] Implement `CapabilityStateView.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, and `Provenance.tsx` under `apps/desktop/src/shared/status/`; ensure only `ready` can reach result children (FR-UIBASE-004/005).
- [x] T018 [P] [US5] Implement accessible `Dialog.tsx`, `ConfirmDialog.tsx`, `ToastRegion.tsx`, `Field.tsx`, and tab primitives under `apps/desktop/src/shared/ui/` with focus trap/restore, Escape, visible focus, and live-region semantics.
- [x] T019 [P] Implement tested `useGridNavigation.ts` and optional `MoreBelow.tsx` under `apps/desktop/src/shared/a11y/` and `shared/ui/`; retain only if used by at least two approved surfaces.
- [x] T020 [US1] Implement `TopBar.tsx`, `StatusBar.tsx`, and `CommandPalette.tsx` under `apps/desktop/src/app/shell/`; remove simulated timing, fake autosave, database/offline claims, vibe cycling, and calculation shortcuts (FR-UIBASE-001/003/008).
- [x] T021 [US1] Replace the temporary root with `apps/desktop/src/app/App.tsx`, `router.tsx`, and provider composition; implement route skeletons and localized not-found behavior (FR-UIBASE-001/013).
- [x] T022 [P] Add shell/component visual snapshots for FR and EN at 1440×1000 and keyboard tests for palette/dialog under `apps/desktop/e2e/visual.spec.ts` and `accessibility.spec.ts`.
- [x] T023 Run `$ksd-ui-acceptance` on Phase 2, update only pre-approved entries in `contracts/visual-acceptance.md`, then run `$ksd-phase-gate` and `pnpm verify:phase`. Do not begin Phase 3 while red.

**Checkpoint evidence**: i18n completeness, component accessibility, shell visual comparison, phase gate output.

---

## Phase 3 — Home, projects, catalog, and settings

**Goal**: Deliver truthful top-level journeys without seeded projects or calculated recommendations.

- [x] T024 [P] [US1] Add failing Home/Projects E2E tests for empty session, six system cards, AIO draft creation, disabled explanatory cards, project resume/removal, and unknown id in `apps/desktop/e2e/navigation.spec.ts` (FR-UIBASE-012/013).
- [x] T025 [P] [US3] Add failing Catalog E2E tests for canonical load, source cue, kind/text filter, no compatibility language, empty results, and injected adapter error in `apps/desktop/e2e/catalog.spec.ts` (FR-UIBASE-011).
- [x] T026 [P] [US2] Add failing locale persistence-across-route tests and complete-copy assertions for all Phase 3 routes in `apps/desktop/e2e/i18n.spec.ts` (FR-UIBASE-009/010).
- [x] T027 [US1] Implement `features/home/SplashPage.tsx`, `HomePage.tsx`, and system-family metadata; keep all six cards visible and enable only AIO draft creation without implying calculation availability.
- [x] T028 [US1] Implement `features/projects/ProjectsPage.tsx` with search, empty state, session-only open/remove flows, confirmation, and no fixture dates or persistence claims.
- [x] T029 [US3] Implement `features/catalog/CatalogPage.tsx`, filters, equipment rows/cards, loading/empty/error states, and provenance using only `CatalogQueryPort` outputs.
- [x] T030 [US2] Implement `features/settings/SettingsPage.tsx` with FR/EN and light/dark session preferences; explicitly state that durable desktop/offline settings arrive in `DESK-001` and remove visual-mode selection.
- [x] T031 [P] Add FR/EN visual snapshots at 1440×1000 and constrained 1024×768 snapshots for Home, Projects, Catalog, and Settings in `apps/desktop/e2e/visual.spec.ts` and `responsive.spec.ts`.
- [x] T032 Run `$ksd-ui-acceptance`, inspect differences against fresh live captures, update the difference ledger, then run `$ksd-phase-gate` and `pnpm verify:phase`. Do not begin Phase 4 while red.

**Checkpoint evidence**: top-level E2E journeys, canonical catalog assertions, bilingual snapshots, difference ledger, phase gate output.

---

## Phase 4 — Eight-step workshop and truthful dossier

**Goal**: Port the validated engineering workflow while keeping every unscheduled calculation unavailable.

- [x] T033 [P] [US1] Add failing workshop route/rail tests for all eight steps, active state, browser back/forward, unknown project, unknown segment, and return navigation in `apps/desktop/e2e/workshop-navigation.spec.ts` (FR-UIBASE-001/013).
- [x] T034 [P] [US4] Add failing truthfulness tests in `apps/desktop/e2e/truth-states.spec.ts` asserting zero engineering/financial result values for presizing, sizing, reliability, compatibility, protection, finance, and dossier production states (FR-UIBASE-003/004/005).
- [x] T035 [P] [US5] Add failing workshop keyboard, 1024×768, 200% text, reduced-motion, and no-document-overflow tests in `apps/desktop/e2e/accessibility.spec.ts` and `responsive.spec.ts` (FR-UIBASE-014/015).
- [x] T036 [US1] Implement `features/workshop/WorkshopLayout.tsx`, step metadata, route guard, dense left rail, mobile-agnostic constrained-desktop behavior, and localized headings matching the approved information architecture.
- [x] T037 [P] [US1] Implement `steps/ProjectStep.tsx` and `steps/SiteStep.tsx` for non-calculated draft inputs and canonical locality/weather-source selection; omit live downloads and invented defaults.
- [x] T038 [P] [US1] Implement `steps/NeedsStep.tsx` using `@ksd/domain` load contracts; distinguish editable inputs/input summaries from calculation outputs and do not port fixture loads into production.
- [x] T039 [US4] Implement `steps/PresizingStep.tsx` and `steps/EquipmentStep.tsx` with approved composition, canonical catalog browse where relevant, and explicit `AIO-001`/`EQP-001` unavailable result areas.
- [x] T040 [P] [US4] Implement `steps/ProtectionStep.tsx` and `steps/FinanceStep.tsx` as approved structured unavailable surfaces owned by `SAFE-001` and `FIN-001`.
- [x] T041 [US4] Implement `steps/DossierStep.tsx` and `features/dossier/` tabs with verification/synoptic/document intent and explicit `DOC-001` unavailable states; do not render prototype report values or generated files.
- [x] T042 [P] [US2] Complete all Phase 4 French and English copy and extend i18n route coverage; fail on any hard-coded user-facing workshop string.
- [x] T043 [P] Add visual snapshots for Needs, Equipment, and Dossier in FR/EN using blank/unavailable production adapters at 1440×1000; use test-only scenarios only for primitive-state coverage.
- [x] T044 Run `$ksd-ui-acceptance`, review the three workshop comparisons against live captures, complete the difference ledger, then run `$ksd-phase-gate` and `pnpm verify:phase`. Do not begin Phase 5 while red.

**Checkpoint evidence**: eight routes, truthfulness assertions, keyboard/responsive checks, bilingual visual review, phase gate output.

---

## Phase 5 — Hardening, acceptance, and convergence

**Goal**: Prove the feature is autonomous, faithful, accessible, bilingual, and ready for AIO-001.

- [x] T045 [P] Run and strengthen production source/bundle scans from `tools/ui/check-production-boundaries.mjs`; prove zero parent, mock, simulated, fixture, test-support, and direct JSON imports (FR-UIBASE-003/017).
- [x] T046 [P] Run the complete FR/EN route matrix, accessibility suite, 1440×1000 and 1024×768 suites, 200% text case, and reduced-motion case; fix all in-scope failures without loosening assertions.
- [x] T047 Use `$ksd-ui-acceptance` for final reviewed visual comparison; record target capture paths and disposition for every intentional difference in `contracts/visual-acceptance.md`.
- [x] T048 Complete the requirement/test/evidence matrix in `checklists/requirements.md`, complete `checklists/visual.md`, and validate every command in `quickstart.md`.
- [x] T049 Run `pnpm verify`; repair and rerun the full gate up to three cycles without updating snapshots merely to obtain green.
- [x] T050 Run `$speckit-converge`; implement all appended tasks, rerun `pnpm verify`, and repeat until convergence is green.
- [x] T051 Mark all completed tasks and set `UI-BASE-001` to `done` in `ROADMAP.md` only after T045–T050 have evidence. Do not begin `AIO-001` in this goal.

## Dependencies & Execution Order

```text
Phase 1 architecture
  → Phase 2 tokens/i18n/shell
    → Phase 3 top-level routes
      → Phase 4 workshop/dossier
        → Phase 5 acceptance/convergence
```

- T002–T005 may run in parallel; T006–T010 implement their contracts; T011 gates all later work.
- T012–T014 may run in parallel; shell composition waits for shared primitives/i18n; T023 gates Phase 3.
- Phase 3 tests may be authored in parallel; implementations share router/shell and should merge sequentially; T032 gates Phase 4.
- Phase 4 tests may be authored in parallel; T036 precedes step implementations; T044 gates closure.
- No task in a later phase may be checked before its prior phase gate is green.

## Requirement Traceability

| Requirements | Primary tasks |
|---|---|
| FR-UIBASE-001/002 | T014–T021, T027–T031, T036–T043 |
| FR-UIBASE-003/017 | T005, T020, T034, T045 |
| FR-UIBASE-004/005 | T002, T009, T017, T034, T039–T041 |
| FR-UIBASE-006/007/008 | T003–T010, T028–T030, T037–T038 |
| FR-UIBASE-009/010 | T012, T016, T026, T042, T046 |
| FR-UIBASE-011/012/013 | T024–T030, T033, T036 |
| FR-UIBASE-014/015 | T013, T018–T023, T031, T035, T043, T046 |
| FR-UIBASE-016/018 | T014, T022–T023, T031–T032, T043–T051 |

## Completion Notes

- Do not mark a task complete without the named file/evidence.
- Never use parent-source edits as implementation.
- Never update a visual baseline solely because the test failed.
- Stop for human approval only if validated UX behavior beyond the pre-approved difference table must change.

## Phase 6: Convergence

- [x] T052 CRITICAL Restore truthful feature status while work remains, then reconcile T012–T051, the requirement/evidence matrix, visual checklist, convergence report, and `ROADMAP.md` only after every named artifact and gate has evidence per Constitution V/VII, FR-UIBASE-018, and T051 (resolved).
- [x] T053 Implement separate workshop step modules for project/site/needs and replace free-form site/weather strings with canonical locality and weather-source selection through workspace contracts; validate stored load inputs with `@ksd/domain` rather than persisting untyped strings per FR-UIBASE-006 and T037–T038 (resolved).
- [x] T054 Complete the workshop intent surfaces: expose canonical catalog browsing without compatibility claims in Equipment, keep every calculation state owned/unavailable, and provide the planned dossier tab structure in dedicated feature/step modules per FR-UIBASE-001/004/011 and T039–T041 (resolved).
- [x] T055 Implement explicit localized unknown-route and unknown-segment recovery, safe localized retry behavior for application-port errors, the required generic Dialog/Flow primitives, and remove unused UI abstractions; add focused primitive tests per FR-UIBASE-001/013/014, US4/AC2, and T013/T018/T019/T021 (resolved).
- [x] T056 Complete static and route-level localization assurance: split the typed FR/EN catalogs and provider/formatter boundaries as planned, scan hard-coded user copy, verify `<html lang>`, and test every top-level/workshop route plus route/draft preservation in both locales per FR-UIBASE-009/010, SC-UIBASE-002, and T012/T016/T026/T042 (resolved).
- [x] T057 Strengthen browser acceptance for all named cases: disabled-card explanations, project resume, injected catalog error/retry, eight step URLs with back/forward and unknown segment, per-surface zero-result assertions, keyboard-only end-to-end navigation, focus trap/restore, workshop 1024×768/200% text, and reduced motion per SC-UIBASE-001/004/006 and T024/T025/T033–T035/T046 (resolved).
- [x] T058 Complete and review the required FR/EN visual matrix at 1440×1000 and 1024×768 for top-level routes, Needs, Equipment, Dossier, palette, and dialog; compare against fresh live references, remove the orphan foundation snapshot, record only observed evidence, rerun Impeccable/UI acceptance, `pnpm test:visual`, `pnpm verify`, and `$speckit-converge` per FR-UIBASE-016/018 and T022/T031/T043/T044/T047–T050 (resolved).

## Phase 7: Faithful-port recovery

- [x] T059 Reopen `UI-BASE-001`, lock the visual authority to `1be343f...`, and record why target-authored snapshots did not establish source fidelity.
- [x] T060 Port the validated sober tokens, global styles, shell, shared UI, and six system assets without prototype runtime dependencies.
- [x] T061 Port Home, Projects, Catalog, and Settings with source geometry and interactions backed by Next application ports.
- [x] T062 Port the workshop shell and all eight source sections; preserve structure while replacing simulated results with roadmap-owned unavailable states.
- [x] T063 Port the dossier structure, palette, dialogs, status presentation, bilingual copy, keyboard behavior, and responsive rules.
- [x] T064 Run phase/final gates and repair all in-scope failures without weakening assertions or inventing results.
- [x] T065 Validate source and target end-to-end in the in-app browser at 1440 × 1000 and 1024 × 768, record observed differences, and complete one bounded repair pass plus confirmation.
- [x] T066 Replace invalid self-authored visual baselines only after source-led review, record final evidence, and close `UI-BASE-001` only if genuinely converged.

## Phase 8: Model-convergence acceptance

- [x] T067 CRITICAL Remove remaining mixed-language workshop/status copy and strengthen static coverage so the complete English route matrix contains no French fallback per FR-UIBASE-009/010 and SC-UIBASE-002 (resolved).
- [x] T068 Replace misleading autosave/database status claims with truthful session-memory and calculation-capability wording while preserving the validated status-bar geometry per FR-UIBASE-003/008 and T020 (resolved).
- [x] T069 Reconcile the obsolete visual selectors and invalid pre-convergence snapshots against the reviewed `9e945de` port plus the pre-authorized canonical/unavailable ledger, then rerun the full visual and repository gates per FR-UIBASE-016/018 and T058/T066 (resolved).

**Recovery evidence (2026-08-13)**: the reference and target were run on isolated strict ports and compared in the in-app browser. The source shell, Home, top-level routes, workshop steps, catalog, palette/dialog, and responsive layout were reviewed at 1440×1000 and 1024×768. `verify:phase`, 16 E2E scenarios, Axe/keyboard checks, and the 12-scenario/36-baseline visual matrix passed; Impeccable returned `[]`. Only the pre-approved truthful differences VD-001–VD-006 remain.

**Convergence evidence (2026-08-11)**: T052–T058 closed after the follow-up audit. `corepack pnpm test:visual` passed 12 scenarios/36 baselines, Impeccable returned `[]`, and `corepack pnpm verify` passed the source contracts, 49 covered tests, production build, and browser acceptance. The catalog error/retry is exercised through a Vite-only injected-service harness outside the production graph. `MoreBelow` and grid-navigation abstractions were not retained because fewer than two approved consumers required them, per the roadmap extraction rule. The clean convergence result is recorded in `convergence.md`.
