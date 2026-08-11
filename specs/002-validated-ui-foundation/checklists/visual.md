# Visual Acceptance Checklist: UI-BASE-001

**Purpose**: Completion evidence for faithful implementation of the validated live design.
**Authority**: `contracts/visual-acceptance.md` and `reference-captures/`
**Owner**: Terra execution goal, reviewed through `$ksd-ui-acceptance`

## Environment

- [x] V001 Target captures use Chromium, deterministic fonts, reset scroll, and 1440 × 1000.
- [x] V002 Constrained-desktop captures use 1024 × 768 and include a 200% text case.
- [x] V003 French and English passes use identical routes and state scenarios.
- [x] V004 Target production entry uses only light/dark `sober` tokens; no `vivid` or `radiant` styles are bundled.

## Shell and navigation

- [x] V005 Brand lockup, dark-blue typography, KYA accents, canvas, panel borders, spacing, and density match the live authority.
- [x] V006 Home preserves system-card hierarchy while replacing prototype recent projects with the approved empty/session state.
- [x] V007 Workshop preserves the eight-step rail, active-step emphasis, header hierarchy, content alignment, and numeric typography.
- [x] V008 Palette, dialogs, tabs, focus rings, and primary/secondary actions preserve interaction priority.

## Truthful differences

- [x] V009 No simulated calculation notice, timing, fake autosave, local-database, or offline claim remains.
- [x] V010 No prototype result number appears in unavailable production states.
- [x] V011 Catalog rows expose canonical source cues without recommendation/compatibility claims.
- [x] V012 Dossier, finance, protection, equipment, and sizing views identify the correct future roadmap owner.

## Accessibility and resilience

- [x] V013 Status is communicated by text/semantics and never by color alone.
- [x] V014 Keyboard focus is visible; palette/dialog focus traps and restoration have complete automated evidence.
- [x] V015 No document-level horizontal scrolling blocks primary actions at 1024 × 768.
- [x] V016 French/English expansion and 200% text do not clip labels or hide controls.
- [x] V017 Reduced motion removes nonessential transitions.

## Review record

- [x] V018 Every visible difference is recorded in `contracts/visual-acceptance.md` with category and evidence.
- [x] V019 No snapshot was updated solely to silence a failure.
- [x] V020 `$ksd-ui-acceptance`, `pnpm test:visual`, final `pnpm verify`, and convergence are green with artifact paths recorded below.

### Evidence to complete during implementation

| Evidence | Path/command | Result |
|---|---|---|
| FR reference captures | `apps/desktop/e2e/visual.spec.ts-snapshots/*-fr-1440-chromium-win32.png` | green |
| EN reference captures | `apps/desktop/e2e/visual.spec.ts-snapshots/*-en-{1440,1024}-chromium-win32.png` | green |
| 1024×768 captures | `apps/desktop/e2e/visual.spec.ts-snapshots/*-1024-chromium-win32.png` | green |
| 200% text capture | `apps/desktop/e2e/responsive.spec.ts` | green |
| Accessibility report | `apps/desktop/e2e/accessibility.spec.ts` | Axe + keyboard green |
| Difference ledger review | `contracts/visual-acceptance.md` | accepted against four live captures |
| Final UI acceptance | `corepack pnpm test:visual`, `corepack pnpm verify` | 12 visual scenarios + complete repository gate green |
