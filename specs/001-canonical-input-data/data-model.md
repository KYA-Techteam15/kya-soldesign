# Data Model: Canonical Input Data

## Shared provenance

```text
Provenance
  sourceId: non-empty string
  sourceRecordId: non-empty string
  sourceSha256: 64 lowercase hex characters
  transformationVersion: semver
```

Import time and machine-local paths are excluded from canonical records to preserve determinism.

## Equipment

Every equipment record has a stable canonical ID, kind, manufacturer, model, normalized electrical fields with unit suffixes, and provenance. `canonicalId` is derived from normalized kind, manufacturer, model, source ID, and source record ID. It is independent of source array position. Nullable means explicitly unknown; absent means invalid schema.

Cross-field constraints belong next to the schema and expose stable issue codes.

### Mandatory and nullable facts

- PV module electrical STC values are mandatory because later string/compatibility checks must not infer them.
- Battery capacity and nominal voltage are mandatory; depth-of-discharge, efficiency, cycle life, and technology may be unknown and block only calculations that require them.
- Inverter nominal AC power and DC voltage are mandatory; surge, efficiency, AC voltage, MPPT, charging, PV, and parallel limits may be unknown and block only calculations that require them.
- All percentages are transformed to ratios at the import boundary. A value of `0` remains zero; unknown is `null`.

## Load model

```text
LoadItem
  id
  label
  quantity > 0 integer
  activePowerW >= 0
  powerFactor in (0, 1] when applicable
  simultaneity in [0, 1]
  schedule: 24 hourly fractions or explicit intervals
```

Daily energy is derived and not persisted as an editable source of truth. A legacy shape is normalized exactly once at import as `hourlyFraction = rawWeight / sum(rawWeights)` when the positive finite source sum is known. The original sum is retained in import evidence, not in the canonical profile contract.

## Weather model

Weather metadata identifies coordinates, elevation, IANA timezone, interval duration, timestamp convention, source, and variable units. Locality seeds may leave elevation/timezone unknown. A weather series may be accepted only when its interval, timestamp convention, units, and strictly ordered timestamps are explicit.

## Import result

```text
ImportResult<T>
  accepted: T[]
  quarantined: { sourceRecordId, issues[], rawFingerprint }[]
  report: counts, completeness, duplicates, conflicts, source hashes, transformations
```
