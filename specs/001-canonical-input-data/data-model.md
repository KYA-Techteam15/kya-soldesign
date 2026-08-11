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

Every equipment record has a stable canonical ID, kind, manufacturer, model, normalized electrical fields with unit suffixes, and provenance. Nullable means explicitly unknown; absent means invalid schema.

Cross-field constraints belong next to the schema and expose stable issue codes.

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

Daily energy is derived and not persisted as an editable source of truth.

## Weather model

Weather metadata identifies coordinates, elevation, IANA timezone, interval duration, timestamp convention, source, and variable units. Series values use one declared interval and strict chronological ordering.

## Import result

```text
ImportResult<T>
  accepted: T[]
  quarantined: { sourceRecordId, issues[], rawFingerprint }[]
  report: counts, completeness, duplicates, conflicts, source hashes
```

