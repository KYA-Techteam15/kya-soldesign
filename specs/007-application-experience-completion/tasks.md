# Tasks: Finalisation de l’expérience applicative

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md` and `contracts/*`  
**Tests**: tests first for every migration, parser, mapper, persisted mutation and critical journey  
**Gate**: `pnpm verify:phase` after each phase; do not continue on red

## Phase 1 — Contracts and foundation

**Goal**: establish versioned models and ports before changing screens.

- [x] T001 Create settings V2 schemas and defaults in `apps/desktop/src/app/models/applicationSettings.ts` (FR-012, FR-018)
- [ ] T002 [P] Add settings V1 fixtures and failing migration tests in `apps/desktop/test/unit/application-settings-migration.unit.test.ts` (FR-013, FR-014)
- [x] T003 Implement atomic V1→V2 migration and recovery behavior in `apps/desktop/src/app/models/applicationSettings.ts` (FR-013, FR-014)
- [ ] T004 [P] Add property tests for numeric bounds, unknown keys and forbidden DoD fields in `apps/desktop/test/property/application-settings.property.test.ts` (FR-014, FR-015, FR-018)
- [x] T005 Define file transfer, asset, exchange, license and release-info ports in `apps/desktop/src/app/contracts.ts` (FR-027, FR-039, FR-047, FR-052, FR-055)
- [x] T006 [P] Define project transfer schemas and conflict results in `apps/desktop/src/app/models/projectTransfer.ts` (FR-023, FR-024, FR-026)
- [ ] T007 [P] Define catalog status/metadata and contextual filter descriptors in `apps/desktop/src/app/models/catalogView.ts` (FR-031, FR-037, FR-038)
- [x] T008 [P] Define document readiness model and pure validator in `apps/desktop/src/app/models/documentReadiness.ts` (FR-044, FR-045)
- [x] T009 Add targeted unit tests for all new discriminated states and parsers (FR-037, FR-044, FR-052)
- [x] T010 Run targeted tests and `pnpm verify:phase`; record evidence before Phase 2

**Checkpoint**: contracts compile, migration is proven and no route has changed.

## Phase 2 — Categorized settings (US2, P1)

**Goal**: deliver safe, categorized and persistent settings.

- [x] T011 [US2] Refactor `apps/desktop/src/store/settings.ts` to own validated `ApplicationSettingsV2` and persistence states (FR-012, FR-060)
- [x] T012 [US2] Create `createProjectWithDefaults` mapping service in `apps/desktop/src/app/services/createProject.ts` (FR-016)
- [ ] T013 [P] [US2] Add mapping tests proving every default and absence of global DoD in `apps/desktop/test/unit/project-defaults.unit.test.ts` (FR-014, FR-016, FR-017)
- [x] T014 [US2] Replace direct settings assignments in `ProjectSessionProvider.tsx` with the service (FR-016, FR-017)
- [ ] T015 [US2] Implement locale-aware settings draft parsing in `apps/desktop/src/app/models/formValues.ts` (FR-011, FR-015, FR-018)
- [x] T016 [US2] Recompose `Settings.tsx` with the nine approved categories and category navigation (FR-010)
- [x] T017 [US2] Add units, help, inline errors and save status to all editable settings (FR-011, FR-015, FR-060)
- [x] T018 [US2] Add reset-category and reset-all confirmation flows (FR-019)
- [x] T019 [US2] Implement recent-project and autosave preferences without a second persistence authority (FR-020, FR-029)
- [x] T020 [US2] Implement configuration inspect/import/export excluding secrets and handles (FR-021)
- [x] T021 [P] [US2] Add FR/EN messages for all settings categories, validation and persistence states (FR-056)
- [ ] T022 [P] [US2] Add E2E for migration, reload, invalid drafts, reset and new-project application (FR-012–FR-021)
- [ ] T023 [US2] Validate keyboard, 1024×700, 760 px and both themes; run `pnpm verify:phase` (FR-057–FR-059)

**Checkpoint**: settings are independently complete and existing projects remain unchanged.

## Phase 3 — Home and project recovery (US1, P1)

**Goal**: make creation and recovery reachable in at most two actions.

- [x] T024 [US1] Extend `TopBar.tsx` with typed secondary actions and accessible count badge (FR-001, FR-002)
- [x] T025 [US1] Extend navigation persistence to resolve a safe resume target per project in `navigationSession.ts` (FR-004)
- [x] T026 [P] [US1] Add unit tests for invalid/deleted resume routes (FR-004)
- [x] T027 [US1] Recompose `Home.tsx` hero, primary AIO card, recent area and roadmap (FR-003, FR-005, FR-006, FR-009)
- [x] T028 [US1] Add create/import empty state and last-project resume action (FR-003, FR-007)
- [x] T029 [US1] Add shared catalog health panel using `CatalogProvider` status (FR-008)
- [x] T030 [US1] Apply configured recent-project limit and truthful completion metadata (FR-020)
- [ ] T031 [P] [US1] Add all home, roadmap, status and action translations (FR-056)
- [x] T032 [US1] Add responsive/reduced-motion styles using existing tokens in `app.css` (FR-009, FR-058, FR-059)
- [ ] T033 [US1] Add E2E for empty, populated, loading/error catalog and bilingual states (FR-001–FR-009)
- [ ] T034 [US1] Complete visual checklist in desktop, dark and 760 px; run `pnpm verify:phase`

**Checkpoint**: US1 is demonstrable independently from the home route.

## Phase 4 — Project transfer and management (US3, P1)

**Goal**: make local projects portable and recoverable.

- [x] T035 [P] [US3] Implement browser `FileTransferPort` adapter in `apps/desktop/src/app/adapters/browserFileTransfer.ts` (FR-027)
- [x] T036 [US3] Implement inspect/export/import/duplicate service in `apps/desktop/src/app/services/projectTransfer.ts` (FR-022–FR-027)
- [x] T037 [P] [US3] Add deterministic round-trip, invalid file and conflict tests (FR-023–FR-026)
- [x] T038 [US3] Expose safe replace/copy operations through the project session port/provider (FR-024, FR-025)
- [x] T039 [US3] Add search, sort, duplicate, import and export actions to `Projects.tsx` (FR-022)
- [x] T040 [US3] Add conflict and import-summary dialogs with translated stable errors (FR-024, FR-056)
- [ ] T041 [US3] Add visible last-save and persistence-error state to projects surfaces (FR-028, FR-060)
- [ ] T042 [US3] Add E2E export/import/copy/conflict/cancel and reload scenarios (FR-022–FR-029)
- [x] T043 [US3] Run `pnpm verify:phase` and record canonical round-trip evidence

**Checkpoint**: a project can leave and re-enter the application without data loss.

## Phase 5 — Catalog completion (US4, P2)

**Goal**: make the existing filtering exact and explainable.

- [x] T044 [P] [US4] Refactor filter state to contextual primary quantity descriptors in `catalogFilters.ts` (FR-030, FR-031)
- [ ] T045 [P] [US4] Expand unit/property tests for all tabs, nulls, dependencies and pagination (FR-030–FR-036, including FR-034)
- [x] T046 [US4] Add removable filter chips and actionable no-result state in `Catalog.tsx` (FR-032, FR-033)
- [x] T047 [US4] Localize tab names, columns, bounds, count and pagination (FR-031, FR-056)
- [x] T048 [US4] Add keyboard-accessible provenance disclosure per row (FR-035, FR-057)
- [x] T049 [US4] Extend catalog metadata source/provider without invented version values (FR-037)
- [x] T050 [US4] Add catalog version/quality presentation to Home and Catalog (FR-008, FR-037)
- [ ] T051 [US4] Add three-tab E2E including page clamp and no-result recovery (FR-030–FR-038)
- [x] T052 [US4] Run `pnpm verify:phase`

**Checkpoint**: all existing catalog data is discoverable with truthful labels.

## Phase 6 — Report identity and readiness (US5, P2)

**Goal**: validate identity and dossier completeness before printing.

- [x] T053 [P] [US5] Implement IndexedDB `ReportAssetRepository` with 2 MiB/type/SVG validation (FR-039–FR-041)
- [ ] T054 [P] [US5] Add asset validation, replacement rollback and deletion tests (FR-040, FR-041)
- [x] T055 [US5] Add logo/signature picker, preview and removal controls to Settings (FR-039–FR-041)
- [x] T056 [US5] Replace remaining hard-coded company and currency text in `ReportA4.tsx` (FR-042, FR-043)
- [x] T057 [US5] Integrate pure `DocumentReadiness` into `DossierDocuments.tsx` (FR-044, FR-045)
- [x] T058 [US5] Add warning-confirm and blocker dialogs before print (FR-044, FR-045)
- [x] T059 [P] [US5] Localize report controls and document labels required by this feature (FR-056)
- [ ] T060 [US5] Add print tests/captures for logo fallback, custom identity, currencies and two pages (FR-042, FR-046)
- [x] T061 [US5] Validate print CSS independently from application theme; run `pnpm verify:phase`

**Checkpoint**: every print request has a readiness result and uses authoritative identity.

## Phase 7 — Currency, license and release information (US6, P3)

**Goal**: expose truthful operational metadata and complete local currency support.

- [x] T062 [P] [US6] Implement decimal exchange-rate parser and exact conversion boundary tests (FR-047, FR-048, FR-049)
- [x] T063 [US6] Add manual rate editing, source/date and stale indication to Settings (FR-047–FR-049)
- [x] T064 [P] [US6] Add default unavailable exchange and unconfigured license adapters (FR-050, FR-052, FR-053)
- [x] T065 [US6] Add license states and read-only unavailable mutations to Settings (FR-052–FR-054)
- [x] T066 [US6] Add build-generated release info and versioned changelog reader (FR-055)
- [ ] T067 [P] [US6] Add adapter-state tests for error, expiry, retry and stale remote response (FR-051–FR-054)
- [ ] T068 [US6] Add remote exchange adapter only after provider approval; otherwise record explicit deferred gate (FR-050, FR-051)
- [ ] T069 [US6] Add activation/deactivation only after license authority approval; otherwise record explicit deferred gate (FR-054)
- [x] T070 [US6] Run `pnpm verify:phase`

**Checkpoint**: local behavior is complete; external mutations are either proven or explicitly unconfigured.

## Phase 8 — Cross-cutting convergence

- [x] T071 Audit hard-coded FR/EN copy in all affected routes and close gaps (FR-056)
- [x] T072 Run keyboard, focus, reduced-motion, screen-reader-name and contrast checks (FR-057–FR-059)
- [ ] T073 Execute all scenarios in `quickstart.md`
- [ ] T074 Complete `checklists/requirements.md` with evidence links
- [ ] T075 Complete `checklists/visual-acceptance.md` with captures
- [ ] T076 Run `pnpm verify` and repair in-scope failures up to three cycles
- [ ] T077 Run Spec Kit convergence and update feature status only after all non-deferred criteria pass

## Dependencies & Execution Order

```text
Phase 1 Contracts
  ├── Phase 2 Settings ──┬── Phase 3 Home
  │                      ├── Phase 4 Projects
  │                      └── Phase 6 Reports
  ├── Phase 5 Catalog ────── Phase 3 Home health panel
  └── Phase 7 Operational metadata

All completed desired phases → Phase 8 Convergence
```

- Phase 1 blocks every implementation phase.
- Phase 3 depends on settings recent-limit and catalog status contracts.
- Phase 4 depends on the transfer contract but not on catalog or reports.
- Phase 6 depends on report settings and asset contract.
- Phase 7 network mutations may be deferred only with explicit unconfigured UI
  and a recorded external-decision gate.
- Tasks marked `[P]` touch distinct files or tests and may run in parallel.

## MVP and incremental delivery

1. **MVP-A**: Phases 1–3 — safe settings and efficient home.
2. **MVP-B**: Phase 4 — project portability.
3. **Release candidate**: Phases 5–6 — catalog and documents complete.
4. **Operations**: Phase 7 — local metadata plus approved external adapters.
5. **Closure**: Phase 8.

No phase is called complete while its gate is red or its acceptance evidence is missing.

## Closure evidence and deferred gates

- `pnpm verify:phase` passes after implementation; golden, integration, coverage,
  property, data and the new APP-001 browser scenarios also pass.
- The full repository `pnpm verify` is intentionally not run because its fixed
  production-build step would generate `dist`, explicitly excluded by the user.
- T068 remains deferred: no remote exchange provider or error policy has been
  approved. Manual offline rates are the only enabled path.
- T069 remains deferred: no license authority has been approved. The UI exposes
  only the truthful `unconfigured` state and no activation/deactivation mutation.
- The legacy workshop copy checker scope is explicitly documented in
  `tools/ui/check-ui-copy.mjs`; APP-001-owned routes pass the check.
