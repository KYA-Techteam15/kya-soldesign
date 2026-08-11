# Tasks: Canonical Input Data

All tasks are required unless explicitly marked optional. Run `$ksd-phase-gate` after each phase.

## Phase 1 — Source audit and decisions

- [x] T001 [FR-DATA-014] Create a deterministic read-only inventory script for the candidate sources listed in `plan.md`.
- [x] T002 [FR-DATA-014] Execute the inventory and complete `research.md` with hashes, field matrices, missingness, duplicates, and classifications.
- [x] T003 [FR-DATA-005] Decide mandatory versus nullable fields for each equipment kind and record rationale in `data-model.md`.
- [x] T004 Run `pnpm verify:phase`; repair in-scope failures before continuing. Evidence: passed after deterministic sort repair on 2026-08-11.

## Phase 2 — Canonical contracts

- [x] T005 [FR-DATA-001] Extend strict versioned schemas for modules, batteries, inverters, provenance, and import issues.
- [x] T006 [FR-DATA-002] Add unambiguous unit-safe load and weather contracts under `packages/domain`.
- [x] T007 [FR-DATA-008] Implement stable cross-field issue codes and physical-range validation.
- [x] T008 [FR-DATA-009] Implement derived daily load energy from one canonical schedule representation.
- [x] T009 [FR-DATA-010] Implement weather metadata/series consistency validation.
- [x] T010 Add unit and boundary tests linked to T005–T009.
- [x] T011 Run `pnpm verify:phase`; repair in-scope failures before continuing. Evidence: passed after guarding strict weather ordering on 2026-08-11.

## Phase 3 — Deterministic import core

- [x] T012 [FR-DATA-003] Implement documented canonical identity normalization and SHA-256 IDs.
- [x] T013 [FR-DATA-004] Implement provenance creation from explicit source metadata and source bytes.
- [x] T014 [FR-DATA-005] Implement explicit legacy scalar parsing without guessed defaults.
- [x] T015 [FR-DATA-006] Implement accepted/quarantine partitioning with field-level issues.
- [x] T016 [FR-DATA-007] Detect duplicate identities and conflicting technical values deterministically.
- [x] T017 Add fast-check properties for determinism, idempotence, Unicode/whitespace normalization, and no unknown-to-zero coercion.
- [x] T018 Run `pnpm verify:phase`; repair in-scope failures before continuing. Evidence: passed on 2026-08-11.

## Phase 4 — CLI and canonical snapshots

- [x] T019 [FR-DATA-011] Add `tools/migration/import-reference-data.mjs` with explicit source/output arguments and no parent path defaults.
- [x] T020 [FR-DATA-012] Emit stable canonical JSON, quarantine JSON, quality JSON, and concise console summaries.
- [x] T021 Import the selected sources into `packages/catalog/data` and account for every input record. Evidence: 870 input, 866 accepted, 4 quarantined; source hashes and per-source counts are in `quality-report.json`.
- [x] T022 Add data tests that parse every generated artifact and verify report totals.
- [x] T023 Add an integration fixture that imports twice and compares artifact hashes.
- [x] T024 Measure and document the NFR-DATA-001 benchmark method and observed result. Evidence: `benchmark.json`, 175.2454 ms for 1,000 records after warm-up on 2026-08-11.
- [x] T025 Run `pnpm verify:phase`; repair in-scope failures before continuing. Evidence: passed on 2026-08-11 after correcting IEEE-754 round-trip tolerance in the existing unit property.

## Phase 5 — Closure

- [x] T026 [FR-DATA-013] Add a requirement-to-test matrix to the checklist and close every uncovered requirement.
- [x] T027 Confirm production code and generated artifacts contain no parent-relative path or legacy runtime dependency. Evidence: exact source/artifact audit on 2026-08-11 returned no parent repository/runtime matches.
- [x] T028 Run `$ksd-data-quality` over the completed snapshots. Evidence: explicit importer run, deterministic fixture re-import, `pnpm test:data`, property suite, and phase gate passed; 870 input, 866 accepted, 4 quarantined, 37 warnings, 0 technical conflicts.
- [x] T029 Run `pnpm verify`, then `$speckit-converge`; implement any appended tasks and repeat until converged. Evidence: `pnpm verify` passed on 2026-08-11; first convergence appended T031, then phase/full gates passed and the second convergence reported zero findings.
- [x] T030 Mark `DATA-001` done in `ROADMAP.md` only after all gates are green and evidence is recorded.

## Phase 6: Convergence

- [x] T031 Add explicit weather-series/source/locality association validation and a boundary test per FR-DATA-010 and US3 (partial). Evidence: phase gate passed on 2026-08-11.
