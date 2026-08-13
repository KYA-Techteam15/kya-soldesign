# Contract: model convergence behind the validated UI

## Authority

The autonomous integration baseline is commit `9e945de` (`feat(ui): restore
validated design as integration baseline`). Its DOM, routes, copy, interaction
patterns, light/sober rendering, and committed Playwright snapshots are the
acceptance baseline for this convergence.

The copied prototype models, stores, fixtures, reference JSON, and mock engine
are migration inputs only. They are not the target architecture and must not
remain production authorities.

## Required dependency direction

```text
React views and validated components
        ↓ view models / form models
application hooks and adapters
        ↓ ports
@ksd/project-format  @ksd/catalog  @ksd/domain  @ksd/engine (later)
```

React must not import persistence formats, canonical JSON snapshots, storage
APIs, or calculation implementations directly.

## Model layers

### Canonical project model

- Use the versioned project contract from `@ksd/project-format`.
- Use canonical domain types and unit-explicit fields from `@ksd/domain`.
- Persist unknown engineering facts as `null` only where the schema permits it.
- Never replace an unknown value with zero, one, a catalog default, or a UI
  placeholder.
- Keep editable inputs separate from immutable calculation evidence.

### Form models

Form models may represent incomplete text, local validation, table editing,
selection, and focus state required by the validated interface. They must expose
explicit, tested conversions to and from canonical values. A form edit does not
become canonical data until boundary validation succeeds.

Required initial form surfaces:

1. project and client identity;
2. site, locality, coordinates, orientation, and weather-source selection;
3. load items, schedules, profiles, quantities, power, yield/power factor, and
   operating duration;
4. catalog filters and equipment projections.

### View models

View models format canonical values for the existing components. They may add
labels, localized copy, units, validation messages, and display grouping. They
must not calculate sizing, compatibility, protections, costs, reliability, or
document results.

### Calculation state

All calculated surfaces consume `CapabilityState<T>` through
`CalculationCapabilityPort`. Only `ready` may expose a current immutable run.
`empty`, `unavailable`, `loading`, and `error` expose no calculated numbers.
`stale` may show previous evidence only with its stale status and input-hash
mismatch clearly identified.

## Data-source rules

- Equipment comes from `@ksd/catalog`; preserve the current catalog information
  density, filters, columns, and counts when supported by canonical data.
- Locality, weather metadata, and loads come through typed domain contracts.
- Prototype fixtures may survive only under test support or a separately injected
  visual-acceptance harness. They must be excluded from the production import
  graph.
- `apps/desktop/src/engine/MockEngine.ts`, `SizingEngine.ts`, and render-time
  engine calls must leave the production graph.
- Parent folders remain read-only references and never runtime dependencies.

## Visual preservation rule

The interface is refined only as required to represent truthful typed states.
Allowed visible changes are limited to:

- field validation and invalid/unknown indicators;
- explicit units;
- loading, error, unavailable, stale, and empty states;
- accessibility fixes that do not materially change the composition;
- overflow corrections caused by canonical content.

Any other change to DOM hierarchy, route structure, spacing, typography, color,
component geometry, information density, copy meaning, or interaction requires
an entry in the intentional-difference ledger and explicit human approval before
implementation.

## Acceptance evidence

1. Mapping table from every migrated prototype field to its canonical or form
   equivalent, including unit conversion and unknown-value behavior.
2. Unit and property tests for both directions of every adapter.
3. Production-boundary scan proving that prototype fixtures, local reference
   JSON, stores, and mock engines are absent from the production import graph.
4. Catalog tests proving canonical counts, provenance, filters, and columns.
5. Project/site/load browser journeys with validation, save, reload-in-session,
   unknown, and error cases.
6. Full existing E2E suite plus visual comparisons at 1440 × 1000 and
   1024 × 768 in French and English.
7. A final diff against `9e945de`, with every visible difference documented and
   approved.
