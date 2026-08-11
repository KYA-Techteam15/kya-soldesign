# Source-to-target adoption inventory

**Visual source**: `../design-proposition/app` at `1be343f814abc6379517389c42e484806634e6bb`
**Runtime rule**: every parent path below is read-only research; no target import may reference it.

## Routes

| Source | Approved intent | Target | Disposition |
|---|---|---|---|
| `src/routes/Splash.tsx` | Branded entry/loading moment | `apps/desktop/src/features/home/SplashPage.tsx` | Port shell/brand; replace fake reference loading with application readiness |
| `src/routes/Home.tsx` | System families, recent projects, quick access | `features/home/HomePage.tsx` | Port; empty recent-project state; no seeded projects |
| `src/routes/Projects.tsx` | Searchable project collection | `features/projects/ProjectsPage.tsx` | Port; session-only drafts; no fake dates |
| `src/routes/Catalog.tsx` | Browse equipment catalog | `features/catalog/CatalogPage.tsx` | Port against `@ksd/catalog`; no compatibility claims |
| `src/routes/Settings.tsx` | Locale/theme/product settings | `features/settings/SettingsPage.tsx` | Port FR/EN and light/dark; remove visual experiment selector and offline claims |
| `src/routes/workshop/WorkshopLayout.tsx` | Eight-step engineering rail | `features/workshop/WorkshopLayout.tsx` | Port geometry, labels, step navigation, responsive behavior |
| `SectionProjet.tsx` | Project identification | `steps/ProjectStep.tsx` | Port editable non-calculated fields using project format |
| `SectionSite.tsx` | Locality/weather-source selection | `steps/SiteStep.tsx` | Port canonical selection; live download deferred |
| `SectionBesoins.tsx` | Load entry modes and table | `steps/NeedsStep.tsx` | Port inputs using domain schemas; derived totals unavailable unless purely input summaries are explicitly identified |
| `SectionHypotheses.tsx` | Pre-sizing input and result intent | `steps/PresizingStep.tsx` | Port layout; production result area unavailable (`AIO-001`) |
| `SectionMateriel.tsx`, `EquipmentPicker.tsx` | Equipment choice and compatibility intent | `steps/EquipmentStep.tsx` | Port hierarchy; catalog browsing allowed, compatibility/quantities unavailable (`EQP-001`) |
| `SectionProtections.tsx` | Protection/cabling intent | `steps/ProtectionStep.tsx` | Port layout; unavailable (`SAFE-001`) |
| `SectionChiffrage.tsx` | Financial intent | `steps/FinanceStep.tsx` | Port layout; unavailable (`FIN-001`) |
| `SectionDossier.tsx` and `routes/dossier/*` | Dossier verification, synoptic, documents | `steps/DossierStep.tsx` and `features/dossier/*` | Port tabs/empty structure; reports unavailable (`DOC-001`) |

## Shell and shared UI

| Source | Target | Disposition |
|---|---|---|
| `shell/TopBar.tsx` | `app/shell/TopBar.tsx` | Port brand, search/palette, locale, theme, new-project action |
| `shell/StatusBar.tsx` | `app/shell/StatusBar.tsx` | Port visual placement; remove simulated timing, fake autosave, database/offline claims |
| `shell/CommandPalette.tsx` | `app/shell/CommandPalette.tsx` | Port commands, keyboard shortcut, focus restoration; translate all copy |
| `shell/ConfirmDialog.tsx` | `shared/ui/ConfirmDialog.tsx` | Port with dialog semantics and focus trap |
| `shell/Toasts.tsx` | `shared/ui/ToastRegion.tsx` | Port as accessible live region; remove timer state from global domain store |
| `shell/VerdictPanel.tsx`, `VerdictTab.tsx` | Deferred visual slot in `shared/status` | Preserve component intent, but no production verdict until `UI-AIO-001` |
| `shell/DayBalance.tsx` | Deferred | Do not port production rendering until `SIM-001` |
| `shell/MoreBelow.tsx` | `shared/ui/MoreBelow.tsx` | Port only if still required after responsive implementation |
| `ui/Dialog.tsx` | `shared/ui/Dialog.tsx` | Port semantics, keyboard close, focus trap/restore |
| `ui/Field.tsx` | `shared/ui/Field.tsx` | Port labels, help, error, units, disabled/read-only states |
| `ui/Flow.tsx` | `shared/ui/Flow.tsx` | Port as layout primitive if two consumers remain |
| `ui/Prov.tsx` | `shared/ui/Provenance.tsx` | Port against canonical source metadata |
| `ui/useGridNav.ts` | `shared/a11y/useGridNavigation.ts` | Port only with tests for arrows/Home/End and roving tabindex |

## Styles and assets

| Source | Target | Disposition |
|---|---|---|
| `styles/tokens.css` | `styles/tokens.css` | Port approved semantic palette and type/spacing scales |
| `styles/app.css` | Split across `styles/base.css`, `app/shell.css`, feature CSS | Port validated rendering; remove selectors tied to simulated content |
| `styles/print.css` | `styles/print.css` | Preserve only non-fictional shell/empty dossier printing; document export remains deferred |
| `styles/vivid.css`, `styles/radiant.css` | None | Delete from target scope; experiments are not approved modes |
| `assets/systems/*.png` | `apps/desktop/src/assets/systems/` | Copy the six latest system schematics; record hashes/licensing context |

### Approved schematic asset integrity

Assets were copied read-only from the validated parent revision `1be343f814abc6379517389c42e484806634e6bb`; their origin remains the project design asset set.

| Target asset | SHA-256 |
|---|---|
| `grid-tied.png` | `d4ab3eaeb5c6703652c9f915882bc7176fc8b07769831d9dbf324db69b7f9229` |
| `pv-diesel.png` | `40e13fa9ff07b8bdd3247438534bff49541a27cbe76ca92089d29a60a553068a` |
| `solar-street-light.png` | `1d4b9619d064adb24ecef46369425ecd665e89f1a3ce83b8d8ebda403a71b28d` |
| `solar-water-pumping.png` | `20ec39081b07b8db2faff2bf9b1534c8b4edaf0527d81187a6c9e9cb278ca0d0` |
| `standalone-all-in-one.png` | `8d38512741a8354a4c889009a76855be1ff67f620ec696ff244c8df18397c512` |
| `standalone-inverter-controller.png` | `7b422ddf0ee7dacc41f13d645908e3253f78f15cfb4e60d37768e164a463d35f` |

## Explicitly rejected runtime source

| Source | Reason |
|---|---|
| `src/engine/MockEngine.ts` | Simulated result production is forbidden |
| `src/engine/SizingEngine.ts` and `src/engine/index.ts` | Prototype calculation API and render-time coupling are not authoritative |
| `src/data/fixtures.ts` | Seeded projects, equipment, and calculation results are presentation fiction |
| `src/data/reference.ts` | Replaced by canonical workspace catalog data |
| `src/domain/types.ts` | Duplicates and conflicts with `@ksd/domain` and `@ksd/project-format` |
| `src/store/project.ts` | Seeds fixtures, persists unversioned data, mixes undo and domain mutation |
| Calculation-related fields in `src/store/ui.ts` | Timestamp-based run truth, simulated duration, and project run state are invalid |
| `src/domain/geocode.ts`, `tmy.ts` live behavior | Network/weather acquisition deferred; only UI intent may be preserved |

## Production forbidden-pattern gate

Scan `apps/desktop/src` and built assets for:

- `design-proposition`, `../kyasoldesign`, `ksd_app`;
- `MockEngine`, `SizingEngine`, `ENGINE_IS_SIMULATED`, `Calculs simulés`;
- imports from `fixtures`, `test/support`, or `e2e/fixtures`;
- prototype localStorage keys `ksd-ui` and `ksd-projects`;
- direct imports of `packages/catalog/data/*.json` from React components.
