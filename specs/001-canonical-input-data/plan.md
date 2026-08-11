# Implementation Plan: Canonical Input Data

## Technical context

- TypeScript 7, pnpm workspace, Node 22+
- Zod runtime boundaries
- Vitest plus fast-check
- JSON snapshots committed to the repository
- Read-only sources inspected outside the repository only when explicit CLI arguments provide them

## Constitution check

- Truthful calculations: no calculation output is introduced.
- Pure core: normalization/import logic lives in packages and receives all nondeterministic values as arguments.
- Units/provenance: explicit schema fields and source hashes are mandatory.
- Scientific assurance: invariants and deterministic fixtures are required.
- Independence: generated artifacts contain no external paths.
- Scope discipline: no database or generic ETL framework.

## Target structure

```text
packages/domain/src/load/
packages/domain/src/weather/
packages/catalog/src/equipment/
packages/catalog/src/import/
packages/catalog/data/
packages/test-kit/src/
tools/migration/import-reference-data.mjs
specs/001-canonical-input-data/
```

## Design decisions

1. JSON snapshots are the portable baseline; a local database may be derived later but is never the source of truth.
2. Importers are pure functions over parsed unknown input; file-system code stays in the CLI adapter.
3. Canonical IDs use a documented normalized identity plus a truncated SHA-256 digest.
4. Nullable technical facts remain distinguishable from zero.
5. Weather series and equipment catalogs use separate schemas and quality reports because their failure modes differ.

## Source candidates to audit

- `../design-proposition/app/src/data/reference/*.json`
- `../kyasoldesign/src/ksd_app/data/standard_profiles.json`
- `../Modules.json`, `../Batteries.json`, `../Inverters.json`
- Legacy SQLite/DuckDB only if the JSON sources cannot account for required records; do not add runtime database coupling.

## Verification strategy

- Unit tests for normalization and every cross-field rule.
- Property tests for deterministic IDs, numeric normalization, profile sums, and import idempotence.
- Data tests that parse every generated canonical/quarantine artifact.
- Integration fixture that runs the CLI twice and compares hashes.
- `pnpm verify:phase` after every task phase and `pnpm verify` at completion.

