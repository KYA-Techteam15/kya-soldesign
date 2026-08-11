# Goal UI-BASE-001 — Validated bilingual UI foundation

## Objective

Complete roadmap feature `UI-BASE-001` in this repository: replace the temporary foundation screen with a faithful, autonomous, French/English port of the validated KYA SolDesign application shell and workflow, while removing all simulated calculation paths and representing every unscheduled capability truthfully.

## Validated design authority

1. The read-only visual source is `../design-proposition/app` at commit `1be343f814abc6379517389c42e484806634e6bb`.
2. Use the light-theme `sober` rendering. Preserve its dark-blue typography, KYA orange/green accents, information hierarchy, spacing, density, shell, eight-step rail, and interaction priority.
3. Use `specs/002-validated-ui-foundation/reference-captures/*-live.png`, captured at 1440 × 1000, as the review reference.
4. Do **not** use `../design-proposition/app/shots/` as a baseline; those exports were rejected as stale.
5. Prototype numbers and project content in the live captures demonstrate layout only. They are never expected production values.

## Execution contract

1. Work only inside this repository. Parent design and legacy directories are read-only research sources and must never become runtime dependencies.
2. Read `AGENTS.md`, `.specify/memory/constitution.md`, `PRODUCT.md`, `ROADMAP.md`, `docs/design-adoption.md`, and every artifact under `specs/002-validated-ui-foundation/` before changing code.
3. Use `$ksd-spec-audit` before implementation, then run `$speckit-analyze`. Resolve unambiguous artifact inconsistencies directly; stop only when a choice changes validated UX or product/domain semantics.
4. Treat `specs/002-validated-ui-foundation/tasks.md` as the authoritative dependency-ordered work list. Execute Phases 1 through 5 in order.
5. Write and observe the named tests failing before implementing each phase. Mark no task complete without its file and evidence.
6. After every phase, use `$ksd-phase-gate` and run `pnpm verify:phase`. On failure, diagnose, repair, and rerun the entire gate up to three cycles. Never continue on red.
7. Use `$ksd-ui-acceptance` after every visible phase and at closure. Do not update visual snapshots merely to make tests pass. Record every intentional difference in the visual acceptance contract/checklist.
8. Implement French first within each slice, but do not close a phase until the same UI-BASE copy and behavior are complete in English. French remains the default locale.
9. Keep the project session in memory. Do not add a database, local persistence, Tauri, cloud sync, live weather download, or formal offline behavior; those belong to later roadmap goals.
10. Consume `@ksd/domain`, `@ksd/catalog`, and `@ksd/project-format` through the application ports. React must not read canonical JSON directly or call an engine directly.
11. Production calculation adapters in this goal must be explicitly unavailable. No `MockEngine`, `SizingEngine`, `ENGINE_IS_SIMULATED`, prototype fixture, random value, hard-coded result, fake timing, fake autosave, or fake offline/database claim may enter production source or output.
12. Test-only visual scenarios are allowed only under test-support paths, injected through application ports, and proven absent from the production import graph/bundle.
13. Preserve the validated design textually in React/TypeScript/CSS and with the six current schematic assets. Do not port `vivid`/`radiant` experiments and do not redesign.
14. At feature closure, run `pnpm verify`, then `$speckit-converge`. Implement appended tasks and repeat until both are green.
15. Mark `UI-BASE-001` done in `ROADMAP.md` only when tasks, requirements checklist, visual checklist, phase evidence, final verification, and convergence are complete.
16. Do not begin `AIO-001` in this goal.

## Autonomous test process

For each phase:

1. Map task requirements to tests.
2. Add tests and confirm they fail for the intended reason.
3. Implement the smallest approved slice.
4. Run focused tests, then `$ksd-ui-acceptance` when the phase is visible.
5. Run `$ksd-phase-gate` and `pnpm verify:phase`.
6. Repair in-scope defects and rerun the entire phase gate, at most three cycles.
7. Record commands, exit codes, tests, visual artifacts, and covered requirement ids in the phase checkpoint.
8. Continue only on green.

Final closure additionally runs the full dual-locale route matrix, accessibility/responsive/text-expansion suites, production boundary scans, `pnpm test:visual`, `pnpm verify`, and `$speckit-converge`.

## Mandatory stop conditions

Stop and report the precise decision needed if:

- implementation would change the approved information architecture, visual hierarchy, workflow semantics, or a visible behavior outside the pre-approved difference table;
- the live source revision/captures conflict materially with the written visual contract;
- a production result would require a missing calculation, source, unit, or invented value;
- a visual baseline, canonical contract, project format, constitution rule, or roadmap boundary must change;
- satisfying the goal would require persistence/database/Tauri scope or a destructive migration.

Do not stop for routine component structure, CSS organization within the plan, fixable test failures, or mechanical refactors.

## Completion report

Return:

- routes/components/assets ported and intentionally excluded;
- French/English key counts and dual-locale route results;
- production-boundary scan results confirming zero parent/mock/fixture/test imports;
- truthful-state coverage and confirmation that unavailable states render no result values;
- keyboard, accessibility, reduced-motion, 1440×1000, 1024×768, and 200% text evidence;
- target visual capture paths and the complete intentional-difference ledger;
- phase-by-phase gate commands/outcomes and repair cycles;
- final `pnpm verify`, `$ksd-ui-acceptance`, and `$speckit-converge` outcomes;
- confirmation that the parent design/legacy sources were not modified and that AIO-001 was not started.
