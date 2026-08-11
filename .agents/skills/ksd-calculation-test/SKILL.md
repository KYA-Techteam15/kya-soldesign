---
name: ksd-calculation-test
description: Design, implement, and run KYA SolDesign calculation assurance tests for TypeScript formulas, units, invariants, constraints, golden cases, and legacy comparisons. Use whenever calculation code, formula sources, unit conversions, equipment decisions, reliability, or financial outputs change.
---

# Validate KSD calculations

1. Read the active spec, `docs/calculation-assurance.md`, and the changed formula/source register entries.
2. Reject production formulas without stable formula and source IDs.
3. Add focused unit tests for nominal, zero, boundary, invalid, and cross-field behavior before or with the implementation.
4. Add fast-check properties for applicable invariants: conservation, monotonicity, non-negativity, bounded ratios, deterministic output, and unit round-trips.
5. Use `test-data/golden/manifest.json` only for independently reviewed expectations. Never update an expected result merely because code changed.
6. Keep legacy outputs under `test-data/legacy-comparison`; treat differences as evidence to investigate, not failures to copy blindly.
7. Run `pnpm test:unit`, `pnpm test:property`, and `pnpm test:golden`, then `pnpm verify:phase`.
8. Repair in-scope implementation/test defects and rerun up to three times. Stop for missing sources, ambiguous equations, or any requested golden change.

Report tested requirement IDs, formula IDs, commands, and remaining scientific uncertainty.

