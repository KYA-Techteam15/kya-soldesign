# Quickstart: UI-BASE-001 verification

## Prerequisites

- Node.js compatible with the root `engines` field.
- `pnpm@11.0.9` through Corepack.
- Repository root: `kya-sol-design-next`.

## Install and run

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm dev
```

The production UI must run with the parent repository unavailable. Do not serve or import `../design-proposition/app`.

## Reference visual environment

- Source commit: `1be343f814abc6379517389c42e484806634e6bb`
- Source mode: `theme=light`, `vibe=sober`
- Reference viewport: `1440 × 1000`
- Constraint viewport: `1024 × 768`
- Locale passes: `fr`, then `en`
- Captures: `reference-captures/*-live.png`

## Phase gate

After each phase in `tasks.md`:

```powershell
corepack pnpm verify:phase
```

Do not continue when red. Diagnose and repair in-scope failures, rerunning the complete phase gate after each repair, up to three cycles.

## Focused UI checks

```powershell
corepack pnpm test:unit
corepack pnpm test:e2e
corepack pnpm test:visual
```

Use `$ksd-ui-acceptance` for the visual, keyboard, accessibility, responsive, localization, and truthfulness review. Visual changes must be entered in the intentional-difference ledger before acceptance.

## Final gate

```powershell
corepack pnpm verify
```

Then run `$speckit-converge`, implement any appended tasks, and repeat both gates until green/converged.

## Manual truthfulness checks

1. Start with cleared session state: no recent project fixture is visible.
2. Create an AIO draft and visit all eight workshop steps.
3. Confirm that pre-sizing, sizing, compatibility, protection, finance, and dossier results are unavailable and contain no prototype values.
4. Switch to English on each top-level route and confirm no raw/mixed key.
5. Inspect the production bundle for the forbidden patterns in `source-inventory.md`.
6. Compare the shell and workshop hierarchy with the live reference captures, not the old shot folder.
