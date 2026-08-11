# Goal DATA-001 — Canonical input data

## Objective

Complete roadmap feature `DATA-001` in this repository: deliver deterministic, versioned, provenance-rich canonical equipment, load, locality, and weather input data that future KYA SolDesign calculations can trust.

## Execution contract

1. Work only inside this repository. The parent legacy and design directories are read-only research sources and must never become runtime dependencies.
2. Read `AGENTS.md`, `.specify/memory/constitution.md`, `ROADMAP.md`, and every file under `specs/001-canonical-input-data/` before changing code.
3. Treat `specs/001-canonical-input-data/tasks.md` as the authoritative dependency-ordered work list. Do not expand scope into sizing, UI migration, databases, or live weather downloads.
4. Use `$ksd-spec-audit` before implementation. Resolve unambiguous artifact inconsistencies directly; stop only if a choice changes domain semantics.
5. Execute phases 1 through 5 in order. After each phase, use `$ksd-phase-gate` and run `pnpm verify:phase`.
6. On a gate failure, diagnose, repair, and rerun the entire phase gate, up to three cycles. Never weaken schemas, tests, thresholds, provenance, or deterministic-output requirements to obtain green status.
7. Use `$ksd-data-quality` for imported snapshots. Every source record must be accepted or quarantined exactly once. Missing technical values must never be guessed or converted to zero.
8. Keep research evidence in `research.md`, mappings in `data-model.md`, and requirement/test traceability in the checklist. Mark tasks complete only with evidence.
9. At feature closure, run `pnpm verify`, then `$speckit-converge`. Implement appended tasks and repeat until converged.
10. Mark `DATA-001` done in `ROADMAP.md` only when all tasks and gates are green.
11. Do not begin `AIO-001` or modify the validated design. The mandatory next roadmap feature is `UI-BASE-001`.

## Mandatory stop conditions

Stop and report the precise decision needed if:

- a technical field’s unit or semantics cannot be established from evidence;
- two credible sources conflict and the selected source changes future calculations;
- satisfying the spec would require inventing missing engineering data;
- an approved golden baseline, validated design behavior, or constitution rule must change;
- a destructive migration would be required.

Do not stop for routine implementation choices, fixable test failures, or mechanical refactors within the approved plan.

## Completion report

Return:

- accepted, quarantined, duplicate, conflict, and warning counts per source;
- generated artifact paths and SHA-256 evidence of deterministic re-import;
- completed requirement-to-test matrix;
- exact verification and convergence commands with outcomes;
- remaining known data gaps and their impact on `AIO-001`.
- confirmation that `apps/desktop` and the validated design source were not modified by this data-only goal.

