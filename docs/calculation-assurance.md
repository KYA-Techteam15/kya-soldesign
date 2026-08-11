# Calculation assurance

## Required evidence for every formula

Each normative formula receives a stable `CALC-*` ID and records:

- purpose and applicability domain;
- equation and canonical units;
- authoritative source identifier and edition/date;
- assumptions and exclusions;
- valid input ranges;
- boundary and failure behavior;
- linked requirements and tests.

No formula is accepted from memory or copied from legacy code without this record.

## Test layers

1. Unit tests: known values, zero/limit behavior, invalid inputs, and branch decisions.
2. Property tests: invariants such as conservation, monotonicity, non-negativity, and unit round-trips.
3. Golden tests: independently reviewed input/output cases with source IDs and reviewer metadata.
4. Legacy comparisons: quantify differences from the former product without treating it as truth.
5. Integration tests: serialization, catalog snapshots, worker boundaries, and full calculation envelopes.
6. UI/E2E tests: verify that displayed values match persisted engine results and that failures remain visible.

## Baseline policy

- A golden file is immutable during ordinary repair.
- Updating a golden requires an approved spec change, an audit explanation, and reviewer metadata.
- Snapshot update commands are never part of autonomous repair loops.
- Coverage thresholds are guardrails, not evidence of scientific validity.

## Autonomous repair policy

An agent may fix implementation or test defects within the approved spec and rerun a failing gate up to three times. It must stop when the failure exposes a missing scientific source, ambiguous requirement, incompatible source data, or requested baseline change.

