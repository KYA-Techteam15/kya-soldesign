# Architecture

## Dependency direction

```text
apps/desktop
    ↓
application adapters (future)
    ↓
packages/engine → packages/domain
packages/catalog → boundary schemas
packages/project-format → packages/domain
```

Dependencies point inward. The engine never calls the UI or infrastructure. A future Web Worker adapter may host the engine, but it cannot contain formulas.

## Package responsibilities

- `packages/domain`: unit-safe primitives, shared identifiers, issues, trace contracts, and runtime schemas used across boundaries.
- `packages/engine`: calculation interfaces and system implementations. Each system owns a bounded module under `src/systems/<system>`.
- `packages/catalog`: normalized equipment schemas, provenance, imports, and catalog quality rules.
- `packages/project-format`: versioned project documents and explicit migrations.
- `packages/test-kit`: golden manifest schemas, reusable assertions, and scientific test helpers.
- `apps/desktop`: presentation and application orchestration. It renders unavailable states rather than generating fallback results.

## Calculation run lifecycle

1. Validate and canonicalize external input.
2. Create an immutable calculation request.
3. Hash canonical input and record engine/model versions.
4. Execute the pure calculation.
5. Return output, issues, constraint violations, and trace entries.
6. Persist input and result as one versioned run.
7. Render the persisted result; never recalculate opportunistically during React render.

## State ownership

- Draft UI state: editable and disposable.
- Canonical project input: validated and serializable.
- Calculation run: immutable evidence derived from one input hash.
- Catalog snapshot: versioned source of equipment facts.
- Preferences: separate from engineering project state.

## Deferred decisions

- Tauri is the desktop packaging target, added in `DESK-001` after the calculation and UI contracts stabilize.
- Rust/WASM is not approved. It may be proposed only with profiling evidence and unchanged TypeScript contracts.
- Cloud synchronization is outside the current roadmap.

