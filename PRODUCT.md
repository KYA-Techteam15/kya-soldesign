# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are KYA photovoltaic engineers and project officers working on desktop computers. They prepare a solar study from project identification through technical and commercial review to a client-ready dossier.

## Product Purpose

KYA SolDesign supports the complete, evidence-based preparation of photovoltaic studies. Success means an engineer can enter and review project inputs, understand what is ready or blocked, execute only validated calculations when they exist, and produce a defensible client dossier without simulated or unexplained results.

## Positioning

The product combines the engineering workflow, calculation traceability, equipment evidence, commercial preparation, and client dossier in one controlled workspace. It distinguishes editable draft input from immutable calculation evidence and never presents fixture or fallback values as calculated facts.

## Operating Context

The application is used primarily in French on desktop-sized screens during photovoltaic project preparation. Engineers move among a project list, equipment catalog, settings, an eight-step workshop, and dossier views. French and English are both mandatory product languages; French is the first implementation language and every new surface must remain structurally ready for complete English translation.

## Capabilities and Constraints

- The autonomous repository uses React, TypeScript, Vite, pnpm workspaces, Zod runtime contracts, Vitest, and Playwright.
- Pure calculations belong to `packages/engine`; React may orchestrate but never invent or opportunistically recalculate engineering results.
- Canonical equipment, locality, weather-source, and load-profile snapshots come from workspace packages.
- The validated React prototype is a read-only visual and interaction authority, never a runtime dependency.
- Desktop packaging, durable local persistence, and formal offline behavior are deferred to `DESK-001`.
- Tauri, database technology, cloud synchronization, and live weather downloads are outside the current UI foundation.

## Brand Commitments

The product name is KYA SolDesign. The validated design in `../design-proposition/app` defines the approved information architecture, visual hierarchy, tokens, typography, spacing, responsive behavior, and professional engineering tone. UI-BASE-001 is a faithful port, not a redesign.

## Evidence on Hand

- Validated React source: `../design-proposition/app/src/`.
- Approved live visual reference: `../design-proposition/app` at commit `1be343f814abc6379517389c42e484806634e6bb`, light theme and `sober` mode.
- Fresh audited captures: `specs/002-validated-ui-foundation/reference-captures/`. The parent `shots/` directory is stale and is not an acceptance authority.
- Canonical data contracts and snapshots: `packages/domain` and `packages/catalog/data`.
- Legacy behavior is research evidence only and may not be imported into the runtime.
- No production sizing, protection, financial, or reliability result exists yet; the UI must represent these capabilities as unavailable rather than fabricate examples.

## Product Principles

- Truth before apparent completeness.
- One explicit owner for every piece of project, catalog, preference, and calculation state.
- Preserve the validated professional workflow and visual language.
- Make blockers, warnings, stale evidence, and unavailable capabilities understandable and actionable.
- Keep every product surface ready for complete French and English localization.

## Accessibility & Inclusion

Keyboard access, visible focus, semantic status communication, dialog focus management, reduced-motion support, usable responsive layouts, and text expansion in both French and English are mandatory acceptance concerns. Color alone must never carry engineering status or meaning.
