# UI model convergence mapping

**Baseline**: `9e945de`
**Target**: `ProjectFileV1` plus an application-owned, runtime-validated
`ProjectInputsV1` stored in `ProjectFileV1.inputs`
**Rule**: this document records semantics; it does not authorize a calculation.

## Production import inventory

The direct-copy baseline has five temporary authorities in its active graph.

| Temporary authority | Direct production consumers | Decision |
|---|---:|---|
| `domain/types.ts` | 17 UI/data/engine modules | Transform to canonical input, form, and view models; delete after migration |
| `data/fixtures.ts` | `store/project.ts` | Test-only visual/browser seed; remove from production entry |
| `data/reference.ts` and copied JSON | 7 UI/domain/engine modules | Replace with `CatalogQueryPort` and canonical snapshots |
| `store/project.ts` | 13 route/shell modules | Replace Zustand ownership with `ProjectSessionPort` and application hooks |
| `engine/*` | 8 calculated surfaces through `engine/index.ts` | Reject as production authority; replace with `CalculationCapabilityPort` |

`apps/desktop/src/features/*` and `apps/desktop/src/app/*` are an older simplified
foundation. They are not the visual target and must not replace the active
`routes/*`, `shell/*`, and `ui/*` surfaces.

## Target model outline

```text
ProjectFileV1
  inputs: ProjectInputsV1
    details: ProjectDetailsInputV1
    site: SiteInputV1
    load: LoadInputV1
    assumptions: AioAssumptionInputV1
    costing: CostingInputV1
    cableChoices: CableChoiceInputV1[]
    protectionChoices: ProtectionChoiceInputV1[]
    currencyCode: ISO-4217 string

ProjectFormModel  ←explicit adapters→  ProjectInputsV1
ProjectViewModel  ←pure projection────  ProjectFileV1 + ProjectInputsV1
CapabilityState<T>                         immutable result evidence
```

Selection identifiers remain in `ProjectFileV1.selectedEquipmentIds`; the form
model projects them into module/battery/inverter slots without duplicating them
in canonical input.

## Project identity and client

| Prototype path | Meaning / source unit | Canonical target | Canonical unit / unknown | Form representation | Conversion | Decision |
|---|---|---|---|---|---|---|
| `id` | Project identifier | `ProjectFileV1.id` | UUID, never unknown | readonly string | legacy IDs only in test mapping; new IDs injected | transform |
| `name` | Study name | `ProjectFileV1.name` | non-empty string | editable text | trim at validation boundary | adopt |
| `systemType` | Prototype topology enum | `ProjectFileV1.system` | `SystemKind` | select value | explicit enum map; `undefined` rejected | transform |
| `createdAt` | Creation instant | `ProjectFileV1.createdAt` | ISO datetime | readonly | injected clock | adopt |
| `updatedAt` | Last input edit | `ProjectFileV1.updatedAt` | ISO datetime | readonly | injected clock on accepted replace | adopt |
| `details.clientName` | Client organisation/person | `inputs.details.clientName` | string; empty allowed while drafting | text | identity | adopt |
| `details.clientAddress` | Postal address | `inputs.details.clientAddress` | string; empty allowed | text | identity | adopt |
| `details.clientTel` | Telephone | `inputs.details.clientPhone` | string; empty allowed | text | rename only; no number coercion | transform |
| `details.clientEmail` | Email | `inputs.details.clientEmail` | string; empty draft, validated when present | email text | trim/lowercase only on accepted canonical value | transform |
| `details.followerName` | KYA project officer | `inputs.details.projectOfficerName` | string; empty allowed | text | rename | transform |
| `details.applicationType` | Usage sector | `inputs.details.applicationType` | explicit enum | select | exact enum map | adopt |
| `details.projectDate` | Study date | `inputs.details.projectDate` | ISO calendar date or `null` | date text | empty → `null`; validate YYYY-MM-DD | transform |
| `details.projectNumber` | Commercial/project reference | `inputs.details.projectNumber` | string; empty allowed | text | identity | adopt |
| `details.projectLocation` | Free-form location printed in dossier | `inputs.details.projectLocationLabel` | string; empty allowed | text | rename; not a locality ID | transform |
| `details.projectImage` | Optional project image reference | `inputs.details.projectImageRef` | string or `null` | file/image control | empty → `null`; no file access in model | defer |
| `currency` | ISO currency used by costing inputs | `inputs.currencyCode` | ISO-4217 uppercase | select/text | uppercase and validate | transform |

## Site and weather

| Prototype path | Meaning / source unit | Canonical target | Canonical unit / unknown | Form representation | Conversion | Decision |
|---|---|---|---|---|---|---|
| `site.country` | Localized country label | view projection from country code | display-only | readonly/text search | locale lookup | transform |
| `site.countryCode` | ISO alpha-2 country | `inputs.site.countryCode` | uppercase ISO alpha-2 or `null` | autocomplete value | empty → `null` | transform |
| `site.localityId` | Selected locality | `inputs.site.localityId` | canonical ID or `null` | autocomplete ID | validate through catalog port | adopt |
| `site.region` | Free-form locality/region label | `inputs.site.regionLabel` | string; empty allowed | text | identity | adopt |
| `site.latitude` | Latitude | `inputs.site.latitudeDeg` | degrees `[-90,90]` or `null` | decimal text | decimal comma accepted; empty → `null` | transform |
| `site.longitude` | Longitude | `inputs.site.longitudeDeg` | degrees `[-180,180]` or `null` | decimal text | decimal comma accepted; empty → `null` | transform |
| `site.tilt` | Array tilt | `inputs.site.arrayTiltDeg` | degrees `[0,90]` or `null` | numeric text/range | decimal comma accepted | transform |
| `site.azimuth` | Array azimuth | `inputs.site.arrayAzimuthDeg` | degrees `[0,360)` or `null` | numeric text/range | normalize only after explicit valid input | transform |
| `site.irradiation` | Prototype mean plane-of-array irradiation | no production input authority | kWh/m²/day result evidence only | readonly result | never migrate as current result | test-only |
| `site.monthlyIrradiation` | 12 prototype POA monthly means | no production input authority | result evidence only | chart/readout | fixture only until sourced weather calculation | test-only |
| `site.weatherSourceId` | Weather metadata selection | `inputs.site.weatherSourceId` | canonical ID or `null` | select | validate source/locality association | adopt |
| `site.irradiationBasis.tilt` | Orientation attached to prototype irradiation | calculation trace/input hash, later | degrees | readonly stale metadata | not production input in UI-BASE | defer |
| `site.irradiationBasis.azimuth` | Orientation attached to prototype irradiation | calculation trace/input hash, later | degrees | readonly stale metadata | not production input in UI-BASE | defer |
| `site.downloadedSource.name` | Ad-hoc downloaded weather label | future imported weather provenance | string or `null` | download dialog | unavailable in UI-BASE production | defer |
| `site.downloadedSource.provider` | Ad-hoc weather provider | future imported weather provenance | string or `null` | download dialog | unavailable in UI-BASE production | defer |

## Load project and profile fields

| Prototype path | Meaning / source unit | Canonical target | Canonical unit / unknown | Form representation | Conversion | Decision |
|---|---|---|---|---|---|---|
| `load.granularity` | UI grouping/time mode | `inputs.load.granularity` | explicit enum | segmented control | identity; unsupported modes remain draft-only | adopt |
| `load.activeProfileId` | Active editable profile | `inputs.load.activeProfileId` | existing profile ID | tab/selection | validate referential integrity | adopt |
| `load.irMin` | Irradiance threshold | `inputs.load.minimumOperatingIrradianceWPerM2` | W/m², finite non-negative | numeric text | decimal comma accepted | transform |
| `profiles[].id` | Profile ID | `inputs.load.profiles[].id` | non-empty stable ID | hidden/readonly | injected ID for new profile | adopt |
| `profiles[].name` | Profile display name | `inputs.load.profiles[].name` | non-empty string | text | trim at validation | adopt |
| `profiles[].color` | UI profile color | `inputs.load.profiles[].displayColor` | validated CSS color string | color control | presentation metadata only | transform |
| `profiles[].source` | Equipment/hourly/meter entry method | `inputs.load.profiles[].source` | explicit enum | segmented control | exact enum map | adopt |
| `classic[].id` | Load row identifier | canonical `LoadItem.id` | stable string | hidden | injected ID | adopt |
| `classic[].name` | Appliance label | canonical `LoadItem.label` | non-empty string | table text | trim at validation | transform |
| `classic[].qty` | Appliance quantity | canonical `LoadItem.quantity` | positive integer | numeric text | parse integer; never default invalid to 1 | transform |
| `classic[].unitPower` | Unit active input power | canonical `LoadItem.activePowerW` | W, finite non-negative | decimal text | decimal comma accepted | transform |
| `classic[].yield` | Prototype efficiency used to derive called power | `inputs.load.items[].efficiencyRatio` | ratio `(0,1]` or `null` | percent/ratio text | preserve ratio; blank → `null` | transform |
| `classic[].opHours` | Daily operating duration | hourly operating fractions | hours/day `[0,24]` | decimal text | deterministic 24-bin schedule adapter; no energy duplicate | transform |
| `inductive[].startupCoef` | Starting-power multiplier | `inputs.load.items[].startupPowerMultiplier` | finite `>=1` or `null` | numeric text | blank → `null`; not used by AIO-001 | defer |
| `hourly[].hour` | Hour index | `inputs.load.hourlyPoints[].hourIndex` | integer `[0,23]` | hourly grid | exact | transform |
| `hourly[].realPower` | Mean real power | `inputs.load.hourlyPoints[].activePowerW` | W | kW display text | kW → W at boundary | transform |
| `hourly[].peakPower` | Peak power | `inputs.load.hourlyPoints[].peakPowerW` | W or `null` | kW display text | kW → W; blank → `null` | transform |
| `meter.monthlyEnergy` | Billed monthly energy | `inputs.load.meter.monthlyEnergyWh` | Wh/month | kWh text | kWh → Wh | transform |
| `meter.meterAmperage` | Meter current rating | `inputs.load.meter.meterCurrentA` | A or `null` | numeric text | decimal comma; blank → `null` | transform |
| `meter.networkType` | Single/three phase | `inputs.load.meter.networkType` | explicit enum | select | enum map | adopt |
| `meter.morningPeakStart` | Morning interval start | `inputs.load.meter.morningPeak.startLocalTime` | HH:mm or `null` | time text | validate local-time syntax | transform |
| `meter.morningPeakEnd` | Morning interval end | `inputs.load.meter.morningPeak.endLocalTime` | HH:mm or `null` | time text | validate interval | transform |
| `meter.eveningPeakStart` | Evening interval start | `inputs.load.meter.eveningPeak.startLocalTime` | HH:mm or `null` | time text | validate local-time syntax | transform |
| `meter.eveningPeakEnd` | Evening interval end | `inputs.load.meter.eveningPeak.endLocalTime` | HH:mm or `null` | time text | validate interval | transform |
| `meter.peakImportance` | Peak weighting | `inputs.load.meter.peakImportanceRatio` | ratio `[0,1]` | percent text | percent display ↔ ratio | transform |
| `meter.targetQualityFactor` | Target quality factor | `inputs.load.meter.targetQualityFactor` | finite domain to be specified | numeric text | retain as input; no formula use | defer |

Canonical `LoadItem.simultaneityRatio` has no prototype field. It must not be
silently set to `1` in migrated production data. The form contract therefore
stores it as nullable until the AIO specification establishes whether it is a
required user input or a documented constant.

## Assumption inputs

These values are editable engineering/commercial assumptions, not outputs. They
may be stored after validation but no formula may consume them in this goal.

| Prototype path | Meaning / source unit | Canonical target | Canonical unit / unknown | Form representation | Conversion | Decision |
|---|---|---|---|---|---|---|
| `lpspMax` | Maximum loss-of-power-supply probability | `inputs.assumptions.maxLpspRatio` | ratio `[0,1]` or `null` | percent text | percent → ratio | defer |
| `lolpMax` | Maximum loss-of-load probability | `inputs.assumptions.maxLolpRatio` | ratio `[0,1]` or `null` | percent text | percent → ratio | defer |
| `systemPr` | System performance ratio | `inputs.assumptions.systemPerformanceRatio` | ratio `[0,1]` or `null` | percent text | percent → ratio | defer |
| `inverterYield` | Inverter efficiency assumption | `inputs.assumptions.inverterEfficiencyRatio` | ratio `[0,1]` or `null` | percent text | percent → ratio | defer |
| `batteryYield` | Battery efficiency assumption | `inputs.assumptions.batteryEfficiencyRatio` | ratio `[0,1]` or `null` | percent text | percent → ratio | defer |
| `batteryVoltage` | Nominal bank voltage assumption | `inputs.assumptions.batteryNominalVoltageV` | V or `null` | numeric text | decimal comma | defer |
| `batteryDod` | Allowed depth of discharge | `inputs.assumptions.batteryDodRatio` | ratio `[0,1]` or `null` | percent text | percent → ratio | defer |
| `pvSpecificCost` | PV specific investment | `inputs.assumptions.pvSpecificCostMinorPerKw` | minor currency units/kW or `null` | money text | major currency → integer minor units | defer |
| `pvMargin` | PV margin | `inputs.assumptions.pvMarginRatio` | ratio | percent text | percent → ratio | defer |
| `batterySpecificCost` | Battery specific investment | `inputs.assumptions.batterySpecificCostMinorPerKwh` | minor units/kWh | money text | major → minor integer | defer |
| `batteryMargin` | Battery margin | `inputs.assumptions.batteryMarginRatio` | ratio | percent text | percent → ratio | defer |
| `inverterSpecificCost` | Inverter specific investment | `inputs.assumptions.inverterSpecificCostMinorPerKw` | minor units/kW | money text | major → minor integer | defer |
| `inverterMargin` | Inverter margin | `inputs.assumptions.inverterMarginRatio` | ratio | percent text | percent → ratio | defer |
| `projectLifetime` | Analysis horizon | `inputs.assumptions.projectLifetimeYears` | positive years or `null` | integer text | parse integer | defer |
| `pvLifetime` | Module lifetime | `inputs.assumptions.pvLifetimeYears` | positive years or `null` | integer text | parse integer | defer |
| `batteryLifetime` | Battery lifetime | `inputs.assumptions.batteryLifetimeYears` | positive years or `null` | integer text | parse integer | defer |
| `inverterLifetime` | Inverter lifetime | `inputs.assumptions.inverterLifetimeYears` | positive years or `null` | integer text | parse integer | defer |
| `pvMaintenance` | Annual PV maintenance | `inputs.assumptions.pvMaintenanceRatioPerYear` | ratio/year | percent text | percent → ratio | defer |
| `batteryMaintenance` | Annual battery maintenance | `inputs.assumptions.batteryMaintenanceRatioPerYear` | ratio/year | percent text | percent → ratio | defer |
| `inverterMaintenance` | Annual inverter maintenance | `inputs.assumptions.inverterMaintenanceRatioPerYear` | ratio/year | percent text | percent → ratio | defer |
| `actualizationRate` | Discount rate | `inputs.assumptions.discountRateRatio` | ratio | percent text | percent → ratio | defer |
| `lcoeGrid` | Reference grid tariff | `inputs.assumptions.gridTariffMinorPerKwh` | minor units/kWh | money text | major → minor integer | defer |
| `emissionFactor` | Grid emission factor | `inputs.assumptions.gridEmissionKgCo2PerKwh` | kgCO₂/kWh | numeric text | decimal comma | defer |
| `autoConsumptionRate` | Self-consumption assumption | `inputs.assumptions.selfConsumptionRatio` | ratio | percent text | percent → ratio | defer |
| `dieselSpecificCost` | Genset reference investment | `inputs.assumptions.dieselSpecificCostMinorPerKw` | minor units/kW | money text | major → minor integer | defer |

All assumption semantics remain subject to the owning roadmap calculation spec.
Storing them does not approve a default, formula, or scientific source.

## Equipment selection, cable and protection inputs

| Prototype path | Meaning / source unit | Canonical target | Canonical unit / unknown | Form representation | Conversion | Decision |
|---|---|---|---|---|---|---|
| `selection.moduleId` | Selected module | `selectedEquipmentIds` + view slot | canonical equipment ID or `null` | picker | validate kind through catalog | transform |
| `selection.batteryId` | Selected battery | `selectedEquipmentIds` + view slot | canonical equipment ID or `null` | picker | validate kind through catalog | transform |
| `selection.inverterId` | Selected inverter | `selectedEquipmentIds` + view slot | canonical equipment ID or `null` | picker | validate kind through catalog | transform |
| `cables[].segment` | Circuit segment | `inputs.cableChoices[].segment` | explicit enum | table row | enum map | adopt |
| `cables[].length` | One-way cable length | `inputs.cableChoices[].lengthM` | m or `null` | numeric text | decimal comma; blank → `null` | transform |
| `cables[].material` | Conductor material | `inputs.cableChoices[].material` | explicit enum | select | identity | adopt |
| `cables[].installation` | Installation mode | `inputs.cableChoices[].installation` | explicit enum | select | enum map | adopt |
| `protections[].segment` | Protected circuit | `inputs.protectionChoices[].segment` | explicit enum | table row | enum map | adopt |
| `protections[].caliberA` | User-selected standard rating | `inputs.protectionChoices[].ratingA` | A or `null` | select | preserve null; no recommendation default | transform |

Compatibility, recommended quantities, cable sizes, voltage drops, and proposed
protection ratings are calculation outputs owned by later roadmap features. They
are not fields of `ProjectInputsV1`.

## Costing inputs

All money is canonical integer minor units plus `currencyCode`. `XOF` has zero
minor decimal places; the currency metadata adapter owns that conversion.

| Prototype path/group | Meaning | Canonical target / conversion | Decision |
|---|---|---|---|
| `useGlobalCost` | Use aggregate versus item pricing | `inputs.costing.useGlobalCost`, boolean | adopt |
| `moduleUnitPrice`, `batteryUnitPrice`, `inverterUnitPrice` | Unit purchase prices | `*UnitPriceMinor`, major → currency-aware integer minor units | transform |
| `moduleMargin`, `batteryMargin`, `inverterMargin` | Item margins in percent | `*MarginRatio`, percent → ratio | transform |
| `definedCostForAccessories` | Absolute versus percentage ancillary pricing | `inputs.costing.ancillaryPricingMode` enum | transform |
| `cablingPrice`, `electricalBoxPrice`, `supportsPrice`, `transportPrice`, `installationPrice` | Ancillary price or percent according to mode | discriminated absolute-minor/ratio values; never ambiguous in canonical model | transform |
| `cablingMargin`, `electricalBoxMargin`, `supportsMargin`, `transportMargin`, `installationMargin` | Ancillary margins | named ratio fields | transform |
| `tvaPercent` | VAT | `vatRatio`, percent → ratio | transform |
| `reductionPercent` | Commercial discount | `discountRatio`, percent → ratio | transform |
| `downPaymentPercent` | Deposit | `downPaymentRatio`, percent → ratio | transform |
| `deliveryTime` | Delivery duration | `deliveryDays`, non-negative integer days | transform |
| `offerValidity` | Quote validity | `offerValidityDays`, non-negative integer days | transform |
| `productWarranty` | Warranty duration | `productWarrantyMonths`, non-negative integer months | transform |
| `additional[].id` | Additional item ID | stable injected ID | adopt |
| `additional[].name` | Additional item label | non-empty string | adopt |
| `additional[].description` | Additional item description | string | adopt |
| `additional[].quantity` | Additional item quantity | finite positive quantity | transform |
| `additional[].costPrice` | Additional unit cost | integer minor units | transform |
| `additional[].marginPercent` | Additional margin | ratio | transform |

Cost totals, tax totals, sale prices, lifecycle cost, LCOE, SVI, and margins in
currency are results and must not be persisted as editable inputs.

## Calculated and derived values

| Prototype authority | Examples | Target | Decision |
|---|---|---|---|
| `MockEngine.loadBalance` | daily energy, real power, starting peak, hourly balance | future immutable AIO/SIM envelope | reject production; test-only baseline |
| `MockEngine.presize` | PV/storage/inverter minima, LPSP, LOLP, SRI, LCOE | `presizing`/`reliability` capability | reject production; defer to AIO/SIM |
| `compatibleInverters` | candidates and broken/fixed constraints | `equipment-compatibility` capability | reject production; defer to EQP |
| `size` / `verify` | array, bank, inverter quantities and constraints | `sizing` capability | reject production; defer to AIO/EQP |
| `cables` / `protections` | sections, drops, ratings | `protections` capability | reject production; defer to SAFE |
| `costing` / `lifecycle` | totals, cash flow, LCOE | `finance` capability | reject production; defer to FIN |
| `verdict` | SVI, viable flag, recommendation | immutable evidence projection | reject production; defer to owning specs |
| `completion.ts` | completion levels and missing labels | pure view readiness from canonical validated input only | transform |
| `readiness.ts` | gates derived partly from mock results | input readiness separate from calculation readiness | transform |

## Canonical reference mapping

| Prototype type | Canonical type | Unit/value transformations | Baseline / canonical counts |
|---|---|---|---|
| `ModuleRef` | `Equipment` where `kind='pv-module'` | `power→nominalPowerW`, `vmp→voltageAtMaximumPowerV`, coefficients retained with explicit `/°C` semantics | 388 visible / 387 accepted; one source record is quarantined |
| `BatteryRef` | `Equipment` where `kind='battery'` | percentages → ratios; nominal energy explicit | 366 / 366 |
| `InverterRef` | `Equipment` where `kind='inverter'` | percentages → ratios; nullable facts remain null | 84 visible / 81 accepted; three source records are quarantined |
| `LocalityRef` | `Locality` | coordinate names gain `Deg`; provenance required | 14 / 14 |
| `WeatherSourceRef` | `WeatherSource` | tilt/azimuth names gain `Deg`; provenance required | 16 / 16 |
| prototype load profiles | `NormalizedHourlyProfile` plus project load form | normalize positive weights once; preserve provenance | 2 canonical profiles |

The visible counts conflict with accepted canonical counts for modules and
inverters. Production must show canonical accepted counts (`387`, `81`) and make
quarantine/quality evidence accessible; visual acceptance fixtures may retain
the source counts only when clearly isolated. This is a pre-authorized
truthfulness difference, not permission to alter layout.

## Classification summary

The mapping classifies fields/authorities as follows:

- `adopt`: stable identity, labels, enums, selections, and user-entered facts
  whose semantics are explicit;
- `transform`: renamed unit-explicit fields, ratios, currency minor units,
  canonical IDs, and boundary validation;
- `test-only`: three rich fixture projects, copied irradiation series, and mock
  result envelopes used solely to guard visual fidelity;
- `defer`: inputs or evidence whose owning calculation specification has not yet
  approved semantics/defaults;
- `reject`: every prototype-generated engineering, financial, compatibility,
  protection, and verdict result in the production path.

No mapping authorizes a guessed default. Any missing simultaneity, scientific
assumption, catalog technical fact, or result remains unknown or unavailable.
