# Tasks: Canonical Input Data

All tasks are required unless explicitly marked optional. Run `$ksd-phase-gate` after each phase.

## Phase 1 — Source audit and decisions

- [ ] T001 [FR-DATA-014] Create a deterministic read-only inventory script for the candidate sources listed in `plan.md`.
- [ ] T002 [FR-DATA-014] Execute the inventory and complete `research.md` with hashes, field matrices, missingness, duplicates, and classifications.
- [ ] T003 [FR-DATA-005] Decide mandatory versus nullable fields for each equipment kind and record rationale in `data-model.md`.
- [ ] T004 Run `pnpm verify:phase`; repair in-scope failures before continuing.

## Phase 2 — Canonical contracts

- [ ] T005 [FR-DATA-001] Extend strict versioned schemas for modules, batteries, inverters, provenance, and import issues.
- [ ] T006 [FR-DATA-002] Add unambiguous unit-safe load and weather contracts under `packages/domain`.
- [ ] T007 [FR-DATA-008] Implement stable cross-field issue codes and physical-range validation.
- [ ] T008 [FR-DATA-009] Implement derived daily load energy from one canonical schedule representation.
- [ ] T009 [FR-DATA-010] Implement weather metadata/series consistency validation.
- [ ] T010 Add unit and boundary tests linked to T005–T009.
- [ ] T011 Run `pnpm verify:phase`; repair in-scope failures before continuing.

## Phase 3 — Deterministic import core

- [ ] T012 [FR-DATA-003] Implement documented canonical identity normalization and SHA-256 IDs.
- [ ] T013 [FR-DATA-004] Implement provenance creation from explicit source metadata and source bytes.
- [ ] T014 [FR-DATA-005] Implement explicit legacy scalar parsing without guessed defaults.
- [ ] T015 [FR-DATA-006] Implement accepted/quarantine partitioning with field-level issues.
- [ ] T016 [FR-DATA-007] Detect duplicate identities and conflicting technical values deterministically.
- [ ] T017 Add fast-check properties for determinism, idempotence, Unicode/whitespace normalization, and no unknown-to-zero coercion.
- [ ] T018 Run `pnpm verify:phase`; repair in-scope failures before continuing.

## Phase 4 — CLI and canonical snapshots

- [ ] T019 [FR-DATA-011] Add `tools/migration/import-reference-data.mjs` with explicit source/output arguments and no parent path defaults.
- [ ] T020 [FR-DATA-012] Emit stable canonical JSON, quarantine JSON, quality JSON, and concise console summaries.
- [ ] T021 Import the selected sources into `packages/catalog/data` and account for every input record.
- [ ] T022 Add data tests that parse every generated artifact and verify report totals.
- [ ] T023 Add an integration fixture that imports twice and compares artifact hashes.
- [ ] T024 Measure and document the NFR-DATA-001 benchmark method and observed result.
- [ ] T025 Run `pnpm verify:phase`; repair in-scope failures before continuing.

## Phase 5 — Closure

- [ ] T026 [FR-DATA-013] Add a requirement-to-test matrix to the checklist and close every uncovered requirement.
- [ ] T027 Confirm production code and generated artifacts contain no parent-relative path or legacy runtime dependency.
- [ ] T028 Run `$ksd-data-quality` over the completed snapshots.
- [ ] T029 Run `pnpm verify`, then `$speckit-converge`; implement any appended tasks and repeat until converged.
- [ ] T030 Mark `DATA-001` done in `ROADMAP.md` only after all gates are green and evidence is recorded.

