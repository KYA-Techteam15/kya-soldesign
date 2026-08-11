---
name: ksd-spec-audit
description: Audit KYA SolDesign feature specifications for scope, calculation sources, units, edge cases, acceptance criteria, traceability, and constitution compliance. Use before planning, after clarification, or whenever a spec changes engineering, financial, data, persistence, or validated UI behavior.
---

# Audit a KSD specification

1. Read `AGENTS.md`, `.specify/memory/constitution.md`, `ROADMAP.md`, and every artifact in the active feature directory.
2. Confirm the feature references one immutable roadmap ID and has explicit in-scope and out-of-scope boundaries.
3. For each engineering or financial result, require canonical units, applicability, failure behavior, formula/source IDs, and testable acceptance criteria.
4. Check unknown, missing, zero, negative, boundary, leap-year, timezone, duplicate, and incompatible-equipment behavior where relevant.
5. Check that no requirement preserves a known legacy defect or permits mock/fallback results.
6. Build a concise finding list ordered by severity: blocker, major, minor.
7. Fix wording or artifact consistency when the intended behavior is unambiguous. Stop and request a decision when alternatives change domain semantics or validated UX.
8. Run `$speckit-analyze` after tasks exist. Do not implement production code while performing this audit unless explicitly requested.

An audit passes only when every requirement can be linked to observable evidence and no calculation depends on an unstated assumption.

