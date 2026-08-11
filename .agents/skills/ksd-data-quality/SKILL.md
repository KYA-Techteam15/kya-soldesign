---
name: ksd-data-quality
description: Validate KYA SolDesign equipment catalogs, load profiles, localities, weather series, import reports, schemas, physical ranges, missingness, duplicates, and provenance. Use after importing or modifying reference data and before calculations consume a new dataset.
---

# Validate KSD data

1. Read the active data spec, its research/mapping artifacts, and `docs/legacy-migration.md`.
2. Run the deterministic importer only with explicit source and output paths. Never add a parent-path runtime default.
3. Parse every accepted, quarantined, and report artifact through its strict runtime schema.
4. Reconcile source totals: every source record must be accepted or quarantined exactly once.
5. Check stable IDs, provenance hashes, unit fields, nullability, physical ranges, duplicates, conflicts, ordering, and deterministic formatting.
6. Re-run the import against identical fixtures and compare output hashes.
7. Run `pnpm test:data`, relevant property tests, and `pnpm verify:phase`.
8. Fix importer/schema defects within the approved mapping. Never invent missing technical values or discard invalid records silently.

Report accepted, quarantined, warning, duplicate, and conflict counts with the exact commands used.

