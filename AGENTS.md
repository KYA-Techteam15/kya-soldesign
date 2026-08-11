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

