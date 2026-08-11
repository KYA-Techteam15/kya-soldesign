---
name: ksd-phase-gate
description: Close a KYA SolDesign implementation phase by running deterministic lint, type, unit, property, data, build, integration, golden, and browser gates as applicable. Use after every tasks.md phase and before continuing autonomously to the next phase.
---

# Execute a KSD phase gate

1. Read `AGENTS.md`, the active `tasks.md` phase, and its requirement IDs.
2. Confirm required tests were added before declaring implementation tasks complete.
3. Run `pnpm verify:phase` from the repository root.
4. On failure, identify the smallest in-scope cause, fix it, and rerun the complete phase gate. Perform at most three repair cycles.
5. Stop and request a decision if repair requires a new scientific assumption, golden update, destructive migration, scope expansion, or validated design change.
6. Mark the phase tasks complete only after the entire phase gate passes.
7. For the final feature phase, also run `pnpm verify` and `$speckit-converge`. Implement appended tasks and repeat until converged.
8. Record evidence: commands, exit status, tests added, requirements covered, and any remaining non-blocking warning.

Never skip a failed check, weaken a schema/threshold, delete a meaningful test, or continue on red.

