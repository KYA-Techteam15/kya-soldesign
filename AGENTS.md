# KYA SolDesign Next — agent contract

## Mission

Build the autonomous TypeScript successor to KYA SolDesign. The validated UI prototype and the Python application are references, never runtime dependencies.

## Non-negotiable boundaries

- Work only inside this repository unless a task explicitly requests read-only legacy research.
- Never import from the parent repository or rely on parent-relative paths.
- Keep `packages/engine` pure: no React, DOM, Tauri, file-system, clock, network, or global mutable state.
- Do not introduce mock, estimated, random, or hard-coded calculation results into production code.
- Do not port a legacy formula until its behavior, units, source, and known defects are documented.
- Never update golden expected values merely to make a test pass. A changed baseline requires a spec decision and an audit note.
- Every public calculation output must expose provenance, warnings, violated constraints, engine version, and input hash.
- Store canonical units internally; convert only at input/output boundaries.

## Required workflow

1. Read `.specify/memory/constitution.md`, `ROADMAP.md`, and the active feature artifacts.
2. Use the relevant KSD audit skill before implementation.
3. Implement tasks in dependency order and keep requirement/test identifiers traceable.
4. Run `pnpm verify:phase` after each task phase.
5. Fix in-scope failures and rerun the gate, up to three repair cycles.
6. Stop for an explicit decision if a scientific source is missing, a golden baseline must change, or the validated design contract would change.
7. Run `pnpm verify` and `$speckit-converge` before declaring the feature complete.

## Time and resource discipline

- Treat every modification as a bounded, page-by-page task. Confirm the current page, the exact behavior to change, and the acceptance criteria before expanding scope.
- Prefer the normal reasoning mode for routine UI corrections and focused iterations. Reserve extended analysis for architecture, calculation contracts, migration decisions, or genuinely ambiguous work.
- Inspect only the relevant legacy/reference surface for the current task. Do not repeat a repository-wide audit when the existing spec and prior findings answer the question.
- Use the smallest sufficient verification set: targeted unit/property tests for local logic, targeted E2E or visual checks for affected flows, and the full gates only at a phase boundary or when shared behavior changes.
- Do not regenerate broad visual snapshots or rerun unrelated suites after a narrow edit. Record why a broader verification is required when it is required.
- Keep commentary and implementation focused; do not begin the next page or an adjacent refactor without explicit scope in the current request.
- Before each implementation task, state the expected files, the validation commands, and the stopping point. After validation, report the actual scope and any resource-heavy command that was necessary.
- Optimize for user value per iteration: make one coherent change, verify it, and wait for confirmation before proceeding to the next page when the request is iterative.

## Commands

- Fast phase gate: `pnpm verify:phase`
- Complete gate: `pnpm verify`
- Unit tests: `pnpm test:unit`
- Property tests: `pnpm test:property`
- Golden tests: `pnpm test:golden`
- Data checks: `pnpm test:data`
- Browser checks: `pnpm test:e2e`

## Source references

- Validated design source: `../design-proposition/app` (read-only reference until migrated).
- Legacy behavior source: `../kyasoldesign/src/ksd_app` (read-only, not authoritative).
- Legacy findings and adoption rules: `docs/legacy-migration.md` and `docs/design-adoption.md`.
