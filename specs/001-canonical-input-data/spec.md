# Feature Specification: Canonical Input Data

**Roadmap input**: `ROADMAP.md` → `DATA-001`  
**Status**: ready-for-implementation  
**Created**: 2026-08-11

## Intent

Create the trustworthy, versioned input layer required by every future calculation: equipment catalogs, localities, weather dataset metadata, and load profiles. Import useful legacy/reference data without copying unsupported defaults or contaminating the new runtime with parent-repository dependencies.

## User scenarios and acceptance

### US1 — Inspect a normalized equipment catalog (P1)

An engineer can load modules, batteries, and inverters from canonical JSON snapshots. Every accepted record has stable identity, explicit units, source provenance, and enough fields to determine which future calculations may use it.

**Acceptance**

- An imported record either validates fully or appears in quarantine with machine-readable reasons.
- Missing technical data remains `null` only where the schema explicitly permits unknown values.
- The importer never replaces missing data with zero, one, or a guessed default.

### US2 — Use canonical load profiles (P1)

An engineer can represent equipment loads and normalized hourly profiles without duplicating daily energy or schedule state.

**Acceptance**

- A normalized 24-hour profile is finite, non-negative, and sums to 1 within the documented tolerance.
- Daily energy is derived from load items and schedules; it is not an independently editable duplicate.
- Invalid hours, negative quantities, or non-finite power are rejected with field paths.

### US3 — Identify location and weather inputs (P1)

An engineer can describe a locality and a weather dataset with coordinates, time basis, units, source, and provenance sufficient for a later solar model.

**Acceptance**

- Latitude, longitude, elevation, timezone, interval, timestamps, and weather variable units are explicit.
- Weather data cannot be silently associated with a different locality or time basis.
- No remote weather download is required by this feature.

### US4 — Audit a migration run (P1)

A maintainer can run one deterministic command against explicitly provided source paths and receive canonical snapshots, quarantine output, and a quality report.

**Acceptance**

- Re-running against byte-identical inputs produces byte-identical canonical data and report content, excluding no timestamps because run time is not embedded.
- The report contains source SHA-256 hashes, accepted/rejected counts, warning counts, field completeness, and transformation identifiers.
- Generated production data contains no parent-relative path.

## Functional requirements

- **FR-DATA-001**: Define strict, versioned runtime schemas for PV modules, batteries, inverters, localities, weather metadata/series, load items, and hourly profiles.
- **FR-DATA-002**: Encode engineering units in field names and domain types; prohibit ambiguous names such as `power`, `capacity`, or `voltage` at persistence boundaries.
- **FR-DATA-003**: Generate deterministic canonical IDs from normalized manufacturer/model/source identity without relying on array position.
- **FR-DATA-004**: Record source ID, source record ID, source hash, and transformation version for every imported record.
- **FR-DATA-005**: Preserve unknown values explicitly where allowed; reject records when a future safety calculation would otherwise misinterpret missing mandatory data.
- **FR-DATA-006**: Separate accepted records from quarantined records and retain field-level validation issues.
- **FR-DATA-007**: Detect duplicate canonical identity and conflicting technical values.
- **FR-DATA-008**: Validate physical ranges and cross-field constraints, including surge power not lower than nominal inverter power and usable depth of discharge in `[0,1]`.
- **FR-DATA-009**: Represent load schedules once and derive daily energy deterministically.
- **FR-DATA-010**: Validate weather timestamp ordering, interval consistency, missing intervals, coordinate/timezone metadata, and declared units.
- **FR-DATA-011**: Expose a platform-independent TypeScript import API plus a CLI adapter under `tools/migration`.
- **FR-DATA-012**: Produce a deterministic JSON quality report and human-readable console summary.
- **FR-DATA-013**: Add data-quality, unit, property, and integration tests linked to these requirement IDs.
- **FR-DATA-014**: Document every accepted mapping and every rejected legacy field in the feature research artifact.

## Non-functional requirements

- **NFR-DATA-001**: Parsing 1,000 equipment records must complete within 2 seconds on the supported development machine after warm-up; record the benchmark method, not a hard-coded test timeout.
- **NFR-DATA-002**: Import output ordering and JSON formatting must be deterministic across supported Windows and Linux environments.
- **NFR-DATA-003**: The import core must not read process environment, current time, network, or global locale.
- **NFR-DATA-004**: All failures must be structured; no invalid record may disappear silently.

## Edge cases

- Duplicate manufacturer/model names with different source IDs.
- Decimal commas, empty strings, textual `N/A`, and stringified numbers in legacy JSON.
- Battery cycle life absent for all records.
- Inverter overload/surge equal to nominal power.
- Unknown timezone, elevation, or weather interval.
- Leap-year weather series and daylight-saving discontinuities.
- A normalized load profile summing to `0.999999999` through floating-point representation.
- Unicode manufacturer/model names and insignificant whitespace differences.

## Out of scope

- PV sizing, storage sizing, compatibility decisions, or financial calculations.
- Live weather download, database selection, UI catalog editing, or cloud synchronization.
- Repairing rejected source records by guessing values.
- Treating the current React reference JSON as scientifically authoritative.

## Success criteria

- **SC-DATA-001**: `pnpm verify` passes from a clean install.
- **SC-DATA-002**: Every source record is accounted for as accepted or quarantined.
- **SC-DATA-003**: Two imports of identical fixtures produce identical SHA-256 hashes for every generated artifact.
- **SC-DATA-004**: Tests demonstrate that unknown technical values never become numeric defaults.
- **SC-DATA-005**: Requirements `FR-DATA-001` through `FR-DATA-014` map to at least one test or inspection artifact in `tasks.md`.

