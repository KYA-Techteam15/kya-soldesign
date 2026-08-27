# Quickstart Validation — Finalisation de l’expérience applicative

## Preconditions

```powershell
cd G:\Code\kya\kya-sol-design\kya\ksd\kya-sol-design\kya-sol-design-next
pnpm install
pnpm dev
```

Use a clean browser profile for migration tests and a second profile populated
with a valid settings V1 payload and at least three projects.

## Scenario A — Empty home

1. Clear project storage only.
2. Open `/accueil` in French.
3. Confirm the top bar contains New project and Recent projects.
4. Confirm AIO is the only dominant available workflow.
5. Confirm future architectures are grouped and non-interactive.
6. Confirm the empty state offers create and import.
7. Create a project and verify the workshop route.

**Expected**: no future architecture creates a project; creation takes one action.

## Scenario B — Resume and recent limit

1. Create or import five projects with distinct update times.
2. Set recent-project limit to three.
3. Visit a non-initial workshop section for the newest project.
4. Return home and reload.
5. Use Resume last project, then Recent projects.

**Expected**: three recent entries are shown; resume opens the safe remembered
route; the top action opens the complete list.

## Scenario C — Settings migration and validation

1. Seed a V1 settings payload with every current field and an obsolete
   `batteryDodPercent` key.
2. Start the application.
3. Inspect all settings categories and migration status.
4. Empty a numeric field, enter comma decimal, out-of-range and valid values.
5. Reload and create a new project.
6. Open a project created before the setting changes.

**Expected**: recognized values migrate; DoD does not; invalid drafts never become
zero; the new project receives defaults; the old project is unchanged.

## Scenario D — Configuration transfer

1. Export configuration.
2. Change two categories.
3. Inspect and import the saved configuration.
4. Confirm the category summary.

**Expected**: only validated configuration is applied; no license token, asset
binary or platform handle is exported.

## Scenario E — Project round-trip

1. Complete identifying fields on a project.
2. Export it.
3. Inspect the JSON with `parseProjectFile` through the import flow.
4. Import it again and choose Copy.
5. Import again and choose Replace, then test Cancel.

**Expected**: copy has new identity/timestamps; replace is explicit; cancel writes
nothing; invalid JSON leaves storage unchanged.

## Scenario F — Catalog filters

For Modules, Batteries and Inverters:

1. Select a manufacturer and category filter.
2. Enter primary and voltage bounds.
3. Verify labels and units for the active tab.
4. Remove one filter chip.
5. Force zero results and recover.
6. Navigate to another page, then tighten a bound.
7. Open provenance with keyboard.

**Expected**: options remain dependent; page clamps correctly; battery uses Ah;
provenance does not depend on hover.

## Scenario G — Report identity and readiness

1. Upload a valid logo under 2 MiB and a signature.
2. Attempt invalid MIME, oversized file and unsafe SVG.
3. Open each document kind for an incomplete project.
4. Resolve blockers but leave one warning.
5. Confirm printing with warning.
6. Repeat in English and with a non-XOF project currency.

**Expected**: invalid assets do not replace valid ones; readiness is explicit;
identity and currency are authoritative; A4 layout remains stable.

## Scenario H — Offline operational states

1. Disconnect network.
2. Enter a manual exchange rate with source and observation date.
3. Open License and About.
4. Retry any unavailable remote operation.

**Expected**: manual rate remains usable; remote update is unavailable rather
than successful; license says unconfigured; installed version remains visible.

## Scenario I — Accessibility and responsive behavior

1. Complete scenarios A, C, F and G using keyboard only.
2. Test light/dark and all three visual intensities.
3. Test 1024×700 and 760 px widths.
4. Enable reduced motion.

**Expected**: no clipped primary action, hidden focus, focus trap or mandatory
animation. A4 preview remains readable but may scroll within its container.

## Required commands at closure

```powershell
pnpm typecheck
pnpm test:unit
pnpm test:property
pnpm check:ui
pnpm verify:phase
pnpm verify
git diff --check
```

Any external-provider scenario not configured must have a passing explicit
`unconfigured` acceptance test and a recorded decision gate; it must not be
reported as an implemented online service.
