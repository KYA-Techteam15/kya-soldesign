# Goal UI-BASE-001-MODEL-CONVERGENCE — Clean models behind the validated UI

## Objective

Refactor the autonomous UI restored at commit `9e945de` so that the approved
interface is backed by clean canonical project, domain, catalog, form, view-model,
and application-port layers. Preserve the current design and information density
while removing copied prototype models, fixtures, local reference data, stores,
and mock calculations from the production import graph.

This goal prepares the codebase for `AIO-001`; it does not implement any AIO,
simulation, compatibility, protection, financial, or document formula.

## Starting authority

1. Start from commit `9e945de` or a direct descendant containing only this goal
   and its contract.
2. Treat `9e945de` and the committed Playwright snapshots as the autonomous UI
   acceptance baseline.
3. Read completely before editing:
   - `AGENTS.md`;
   - `.specify/memory/constitution.md`;
   - `PRODUCT.md` and `ROADMAP.md`;
   - `docs/architecture.md`, `docs/design-adoption.md`, and
     `docs/legacy-migration.md`;
   - `specs/001-canonical-input-data/`;
   - `specs/002-validated-ui-foundation/`;
   - `specs/002-validated-ui-foundation/contracts/model-convergence.md`;
   - current public contracts in `packages/domain`, `packages/catalog`,
     `packages/project-format`, and `packages/engine`.
4. The parent design and Python repositories are read-only evidence. Never import
   them or modify them.

## Non-negotiable visual contract

- Do not redesign, simplify, restyle, or replace the current interface.
- Preserve routes, DOM hierarchy, component geometry, typography, spacing,
  colors, density, copy meaning, keyboard interactions, responsive behavior, and
  the eight workshop steps.
- Do not replace copied screens with the former simplified `features/*` UI.
- Make only the minimum visible changes needed for validation, explicit units,
  unknown values, or truthful capability states.
- Before any other intentional visible change, stop and request approval with a
  screenshot, rationale, affected routes, and proposed ledger entry.

## Required implementation phases

### Phase 1 — Inventory and mapping, no runtime change

1. Inventory every production import of:
   - `apps/desktop/src/domain/types.ts`;
   - `apps/desktop/src/data/fixtures.ts`;
   - `apps/desktop/src/data/reference.ts` and `data/reference/*.json`;
   - `apps/desktop/src/store/project.ts`;
   - `apps/desktop/src/engine/*`.
2. Create a traceable mapping table covering every prototype project, client,
   site, load, catalog-selection, pricing, and calculation field.
3. For each field record: source semantics, source unit, canonical target,
   canonical unit, null/unknown policy, form representation, conversion, and
   migration decision (`adopt`, `transform`, `test-only`, `defer`, or `reject`).
4. Stop if a field's scientific meaning or unit cannot be established without a
   human decision. Do not guess.
5. Run `corepack pnpm verify:phase` and commit the mapping separately.

### Phase 2 — Project session and form models

1. Make `ProjectFileV1` from `@ksd/project-format` the single canonical project
   document.
2. Implement focused form/view models and tested adapters for project/client,
   site, and load surfaces.
3. Implement `ProjectSessionPort` without exposing Zustand, storage, clocks, or
   IDs to React components. Inject clock and ID creation at the application
   boundary.
4. Preserve the exact current fields, tables, labels, validation placement, and
   routes. Do not remove details merely because the canonical model needs an
   adapter.
5. Test round trips, incomplete inputs, decimal commas, nulls, invalid values,
   and canonical unit conversion.
6. Run the phase gate, E2E project/site/load journeys, and visual comparison
   before committing.

### Phase 3 — Canonical catalog integration

1. Replace direct imports of copied reference JSON with `CatalogQueryPort` backed
   by `@ksd/catalog`.
2. Preserve the validated tabs, filters, columns, row density, provenance, and
   supported counts for modules, batteries, and inverters.
3. Never infer a missing equipment field or display compatibility,
   recommendation, or quantity without calculation evidence.
4. Keep loading, no-results, validation-error, and retry states within the current
   catalog composition.
5. Run catalog contract tests, data tests, E2E, and visual comparison before
   committing.

### Phase 4 — Calculation capability boundary

1. Route every calculated surface through `CalculationCapabilityPort` and
   `CapabilityState<T>`.
2. Remove render-time and production imports of `MockEngine`, `SizingEngine`, and
   copied completion/readiness calculations.
3. Preserve exact rich fixture results only in isolated test/visual-acceptance
   support injected from a non-production entry point.
4. In the production entry point, render the existing geometry with truthful
   `empty`, `unavailable`, `loading`, `error`, or `stale` content until roadmap
   owners provide a real immutable run.
5. Do not implement formulas and do not manufacture envelopes or numerical
   placeholders.
6. Run production-boundary, truth-state, E2E, and visual checks before committing.

### Phase 5 — Remove duplicate runtime authorities

1. Delete copied prototype models/data/engine code only after all production
   consumers have migrated and exact targets have been verified.
2. Keep visual fixtures in a clearly named test-support directory only when they
   are still required for acceptance captures.
3. Remove or quarantine the superseded simplified UI only if it has no production
   or test consumer; do not switch the application back to it.
4. Ensure production React consumes ports/hooks/view models, not package JSON,
   persistence, or calculation implementations.

### Phase 6 — Bounded final validation

1. Run:
   - `corepack pnpm typecheck`;
   - `corepack pnpm lint`;
   - `corepack pnpm test:unit`;
   - `corepack pnpm test:property`;
   - `corepack pnpm test:data`;
   - `corepack pnpm test:e2e`;
   - `corepack pnpm test:visual`;
   - `corepack pnpm check:ui`;
   - `corepack pnpm verify`.
2. Inspect source/target screenshots once as a complete batch at 1440 × 1000 and
   1024 × 768, French and English. Repair all in-scope differences in one batch,
   then perform at most one confirmation pass.
3. Compare the final result to `9e945de`. Document every visible difference,
   including truthful unavailable states, and obtain approval for any difference
   outside the pre-authorized list.
4. Run `$speckit-converge`, implement only in-scope appended work, and repeat until
   convergence is green.

## Forbidden shortcuts

- No new calculation formula in React, adapters, stores, or fixtures.
- No guessed defaults for missing technical values.
- No broad `any`, unchecked casts, or duplicated canonical type hierarchy.
- No snapshot regeneration merely to make a visual test pass.
- No weakening of scientific, data-quality, accessibility, production-boundary,
  or visual thresholds.
- No mass deletion before consumers and exact paths are proven.
- No change to the roadmap status of `AIO-001`.

## Mandatory stop conditions

Stop and report a precise decision request if:

- a prototype field has ambiguous semantics or units;
- canonical contracts cannot represent an interface fact without a public schema
  decision;
- canonical catalog counts or facts conflict with the visible baseline;
- a truthful state requires a material redesign rather than a minimal adjustment;
- a committed visual baseline must change outside the allowed difference list;
- completing the work would require implementing a formula owned by `AIO-001`,
  `SIM-001`, `EQP-001`, `SAFE-001`, `FIN-001`, or `DOC-001`.

Do not stop for mechanical mappings, local refactors, fixable tests, or ordinary
adapter design.

## Completion report

Return:

- commits produced per phase;
- mapping counts by `adopt/transform/test-only/defer/reject`;
- canonical/form/view-model/port files created;
- removed production imports and remaining test-only fixtures;
- project, catalog, locality, weather, and load data counts;
- full command outcomes;
- screenshot matrix and intentional-difference ledger;
- confirmation that the parent repositories and calculation roadmap features
  were not modified;
- the exact recommended next goal, which must be `AIO-001-SPEC` unless a documented
  blocker remains.
