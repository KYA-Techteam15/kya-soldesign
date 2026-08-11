# Requirements Quality Checklist

- [x] Scope excludes system calculations and UI work.
- [x] Accepted and quarantined outcomes are both specified.
- [x] Unknown values cannot silently become defaults.
- [x] Determinism is testable through artifact hashes.
- [x] Units and provenance are explicit requirements.
- [x] Legacy/reference sources are non-authoritative.
- [x] Edge cases include missing, conflicting, temporal, numeric, and Unicode data.
- [x] Autonomous repair has a defined stop boundary.
- [x] Implementation evidence maps every `FR-DATA-*` requirement to a test or inspection artifact.

## Requirement-to-evidence matrix

| Requirement | Implementation evidence | Verification evidence |
|---|---|---|
| FR-DATA-001 | `packages/domain/src/{load,weather}.ts`, `packages/catalog/src/schemas.ts` | domain/catalog unit and data tests |
| FR-DATA-002 | unit-suffixed contracts in `packages/domain/src` | `units.unit.test.ts`, `units.property.test.ts` |
| FR-DATA-003 | `canonicalIdentity` and `canonicalId` | `reference-import.property.test.ts` |
| FR-DATA-004 | provenance contract and importer provenance adapter | `generated-snapshots.data.test.ts` manifest/schema checks |
| FR-DATA-005 | nullable schemas and explicit legacy scalar parser | `reference-import.unit.test.ts`, property unknown-value check |
| FR-DATA-006 | accepted/quarantine import result and issue schemas | generated snapshot parsing and total reconciliation |
| FR-DATA-007 | canonical identity duplicate/conflict grouping | `reference-import.unit.test.ts` conflicting inverter case |
| FR-DATA-008 | equipment cross-field validation | `equipment-validation.unit.test.ts` and catalog data test |
| FR-DATA-009 | one 24-hour schedule and derived daily Wh | `load.unit.test.ts` |
| FR-DATA-010 | strict weather series schema and temporal validation | `weather.unit.test.ts` |
| FR-DATA-011 | pure TypeScript importer plus explicit-argument Node adapter | `reference-import.integration.test.ts` |
| FR-DATA-012 | deterministic snapshots, report, manifest, concise CLI output | integration byte comparison and data artifact digest test |
| FR-DATA-013 | unit, property, data, and integration suites | `pnpm verify:phase` |
| FR-DATA-014 | read-only inventory, research register, and mapping decisions | `source-inventory.json`, `research.md` |
