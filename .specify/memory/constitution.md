# KYA SolDesign Next Constitution

## Core Principles

### I. Truthful calculations only

Every displayed engineering or financial value MUST originate from a versioned production calculation. Mock values, random values, UI-side formulas, silent fallbacks, and values copied from the legacy interface are forbidden in production paths. An unavailable calculation MUST be represented as unavailable, with a reason.

### II. Pure TypeScript calculation core

Calculation logic MUST live in `packages/engine` as deterministic TypeScript. The engine MUST NOT depend on React, DOM, Tauri, storage, network, time, locale, or mutable global state. Inputs and outputs MUST be serializable contracts. Expensive computations MAY be hosted in a Web Worker without changing the engine contract.

### III. Units, provenance, and traceability

Canonical units MUST be explicit in names and types. Conversions MUST occur at boundaries. Every public result MUST include engine version, input hash, warnings, violated constraints, and trace entries linking outputs to formula and source identifiers. Every normative formula MUST have an entry in the feature research or calculation register.

### IV. Test-first scientific assurance

Critical formulas and decision branches MUST have unit, boundary, invariant, and reviewed golden tests before they are considered complete. Golden expectations MUST NOT be updated to silence failures. Legacy comparisons MUST be labelled as comparisons and MUST NOT become approved truth without independent validation.

### V. Autonomous green gates

Each implementation phase MUST end with `pnpm verify:phase`. The agent MAY diagnose, repair, and rerun in-scope failures up to three times. Work MUST NOT continue on a red gate. Feature completion additionally requires `pnpm verify` and Spec Kit convergence.

### VI. Independent and migration-safe

The repository MUST remain movable without changes. Production code MUST NOT reference parent paths or import legacy modules. Persistent formats and catalogs MUST be versioned, strictly validated, and migrated explicitly. Unknown data MUST remain unknown rather than receive invented defaults.

### VII. Scope discipline and deletion over compatibility

Only behavior required by an approved spec is implemented. Superfluous legacy state, duplicated services, speculative abstractions, and unused variables MUST be deleted rather than preserved for compatibility. Backward compatibility exists only through deliberate data migrations.

## Technology and architecture constraints

- Package manager: pinned pnpm workspace.
- Application: React/Vite, packaged with Tauri when the desktop packaging feature is scheduled.
- Domain validation: runtime schemas at every file, network, import, and persistence boundary.
- Calculation core: TypeScript, pure functions or stateless services, no production mock engine.
- Tests: Vitest, fast-check, Playwright, and reviewed golden datasets.
- Money: integer minor units with an ISO currency code; no binary floating-point accumulation for financial totals.
- Performance: profile before optimizing; Rust/WASM requires an approved architectural decision.

## Development workflow and quality gates

1. Select the next dependency-ready `ROADMAP.md` entry.
2. Complete `specify → clarify → plan → checklist → tasks → analyze`.
3. Implement one task phase at a time.
4. Run the relevant KSD audit skill and `pnpm verify:phase`.
5. Repair and rerun up to three times; escalate semantic ambiguity rather than inventing behavior.
6. Run `pnpm verify` and `$speckit-converge` until converged.
7. Mark the roadmap entry done only when acceptance evidence exists.

Human approval is mandatory for changes to scientific sources, golden baselines, validated UX behavior, public project formats, or this constitution. Routine code repair within an approved plan proceeds autonomously.

## Governance

This constitution overrides feature plans, prompts, and legacy behavior. Amendments require a documented reason, impact assessment, migration plan where applicable, and a version increment. Every feature plan MUST include a constitution check, and every completion report MUST cite the commands and artifacts used as evidence.

**Version**: 1.0.0 | **Ratified**: 2026-08-11 | **Last Amended**: 2026-08-11

