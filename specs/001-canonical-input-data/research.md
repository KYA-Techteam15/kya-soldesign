# Research Register: Canonical Input Data

## Required before implementation

The implementing agent must complete this file with evidence, not assumptions.

| ID | Question | Required output |
|---|---|---|
| SRC-DATA-001 | Which JSON source is the most complete for each equipment type? | Record counts, field matrix, hashes, duplicates, and recommendation |
| SRC-DATA-002 | Which legacy fields carry ambiguous units or semantics? | Mapping table with adopt/transform/compare-only/reject classification |
| SRC-DATA-003 | Which equipment fields are mandatory for AIO pre-sizing versus later detailed compatibility? | Field requirement matrix linked to AIO-001 needs |
| SRC-DATA-004 | What are the semantics and normalization of `standard_profiles.json`? | Profile model, sum tolerance, timezone/day-type interpretation |
| SRC-DATA-005 | What weather fields and time conventions exist in current sources? | Unit/time-basis inventory and gaps |

## Non-authoritative known findings

- Current reference batteries have widespread missing cycle-life information.
- Many inverter records do not establish meaningful parallel capacity.
- Some overload values appear equal to nominal power.
- The legacy application contains duplicated state and services; database shape alone is not a target architecture.

These findings guide investigation but must be reproduced with deterministic scripts and recorded evidence.

