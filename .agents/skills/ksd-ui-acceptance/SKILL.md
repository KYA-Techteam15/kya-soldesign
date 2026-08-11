---
name: ksd-ui-acceptance
description: Verify KYA SolDesign React interface behavior, validated design fidelity, truthful calculation states, accessibility, responsive layout, end-to-end flows, and visual regression. Use after UI, routing, state, result presentation, or design-token changes.
---

# Validate the KSD interface

1. Read the active UI spec and `docs/design-adoption.md`.
2. Confirm every displayed result comes from a persisted production calculation envelope; unavailable or stale results must be explicit.
3. Test keyboard navigation, focus, labels, errors, loading, empty, stale, warning, and constraint-violation states.
4. Run component/unit checks as available, then `pnpm build` and `pnpm test:e2e`.
5. Run `pnpm test:visual` in the same environment used to create baselines.
6. Do not run snapshot-update commands during autonomous repair. A baseline change requires approved visible intent and review.
7. Repair implementation defects and rerun up to three times. Stop if the correction changes validated information architecture, visual hierarchy, or workflow semantics.

Report affected flows, viewports, browsers, commands, and any intentional design difference.

