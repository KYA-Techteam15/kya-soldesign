# Requirements Quality Checklist: UI-BASE-001

**Purpose**: Verify that the UI foundation requirements are complete, testable, bounded, and constitution-compliant before Terra implements them.
**Created**: 2026-08-11
**Feature**: `specs/002-validated-ui-foundation/spec.md`

## Scope and authority

- [x] CHK001 The immutable roadmap id and dependency on DATA-001 are explicit.
- [x] CHK002 The exact live design revision, approved mode, viewport, and fresh capture set are explicit.
- [x] CHK003 Stale parent screenshots are excluded as acceptance baselines.
- [x] CHK004 Visual preservation and allowed truthfulness/accessibility/responsive corrections are distinguished.
- [x] CHK005 Calculation, database, persistence, Tauri, live weather, and redesign work are explicitly out of scope.

## Truthfulness and architecture

- [x] CHK006 Every calculation-dependent state has a typed observable behavior.
- [x] CHK007 Only immutable ready evidence may contain a current result.
- [x] CHK008 Production UI-BASE behavior is unavailable-only for calculations.
- [x] CHK009 Prototype fixtures, mock engines, duplicate contracts, timestamp truth, and parent imports are explicitly forbidden.
- [x] CHK010 Canonical workspace contract ownership and application-port boundaries are named.
- [x] CHK011 Project state is explicitly empty/session-only and does not silently select a database.
- [x] CHK012 Test-only scenario data is isolated and protected by a production import-graph gate.

## Product behavior

- [x] CHK013 The six system families, enabled/disabled behavior, top-level routes, and eight workshop steps are specified.
- [x] CHK014 French default and complete French/English parity are testable requirements.
- [x] CHK015 Unknown project/route, empty catalog, catalog error, and absent capability cases are covered.
- [x] CHK016 Keyboard, focus, status semantics, reduced motion, text expansion, and non-color status are covered.
- [x] CHK017 Reference and constrained desktop viewports are measurable; unsupported mobile redesign is excluded.

## Execution and evidence

- [x] CHK018 Every functional requirement maps to task ids in `tasks.md`.
- [x] CHK019 Each task phase names tests, implementation, phase gate, repair limit, and a red-gate stop.
- [x] CHK020 Final completion requires boundary scans, bilingual matrix, visual review, `pnpm verify`, UI acceptance, and Spec Kit convergence.

## Requirement-to-evidence matrix

| Requirement | Planned implementation evidence | Planned verification evidence |
|---|---|---|
| FR-UIBASE-001/002 | app shell, routes, tokens, assets, feature views | navigation E2E + reviewed visual matrix |
| FR-UIBASE-003/017 | clean production imports and output | forbidden-pattern source/bundle scan |
| FR-UIBASE-004/005 | typed state union + unavailable adapter | state unit tests + zero-result E2E assertions |
| FR-UIBASE-006/007 | workspace types + application ports | contract/integration tests |
| FR-UIBASE-008 | in-memory adapter and truthful settings/status copy | persistence-absence inspection + E2E copy checks |
| FR-UIBASE-009/010 | typed FR/EN catalogs | key equality, hard-coded copy scan, dual-locale E2E |
| FR-UIBASE-011 | canonical catalog projection | adapter and catalog E2E tests |
| FR-UIBASE-012/013 | system cards and route guards | navigation E2E tests |
| FR-UIBASE-014/015 | accessible primitives and resilient CSS | keyboard/a11y/responsive/text-expansion tests |
| FR-UIBASE-016/018 | live captures, ledger, phase gates | UI acceptance report + final verification/convergence |
