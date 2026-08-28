# Data Model — Profils annuels, échanges de charges et données météo durables

## Principes

- profils, calendrier et affectations sont trois autorités distinctes ;
- les grandeurs canoniques portent leurs unités ;
- une série calculée ne devient pas une entrée éditable concurrente ;
- les imports sont des candidats jusqu’à validation complète ;
- une seule branche de besoin est active et calculée ;
- le dialogue composé travaille sur un brouillon sans référence mutable au projet ;
- la fréquence graphique n’est jamais une fréquence de calcul ;
- pays et localités utilisent des identités stables, pas leur libellé courant ;
- les données météo et projets sont rattachés atomiquement.

## LoadDefinitionV2

```ts
interface LoadDefinitionV2 {
  readonly version: 2;
  readonly activeMode: 'simple' | 'composed';
  readonly simple: SimpleAnnualLoadV2;
  readonly composed: ComposedAnnualLoadV2 | null;
}

interface SimpleAnnualLoadV2 {
  readonly activeSource: 'equipment' | 'hourly' | 'meter';
  readonly equipmentItems: readonly EquipmentLoadRowV2[];
  readonly hourlyProfile: DirectDailyLoadProfileV2;
  readonly meter: MeterLoadInputV1 | null;
}

interface ComposedAnnualLoadV2 {
  readonly organization:
    | 'workweek-weekend'
    | 'periods'
    | 'periods-by-day-type';
  readonly calendar: LoadCalendarV2;
  readonly profiles: readonly DirectDailyLoadProfileV2[];
}
```

Invariants : `activeMode` désigne l’unique autorité du calcul ; `simple` reste
conservé lorsque `composed` est actif ; aucun champ équipement ou facture
n’existe dans `ComposedAnnualLoadV2`.

## LoadCalendarV2

```ts
interface LoadCalendarV2 {
  readonly version: 2;
  readonly mode: 'workweek-weekend' | 'periods' | 'periods-by-day-type';
  readonly dayGroups: readonly DayGroupV1[];
  readonly periods: readonly LoadPeriodV1[];
  readonly assignments: readonly LoadProfileAssignmentV1[];
}

interface DayGroupV1 {
  readonly id: string;
  readonly kind: 'all-days' | 'workweek' | 'weekend';
  readonly weekdaysIso: readonly (1 | 2 | 3 | 4 | 5 | 6 | 7)[];
}

interface LoadPeriodV1 {
  readonly id: string;
  readonly name: string;
  readonly startMonthDay: string; // MM-DD
  readonly endMonthDay: string;   // MM-DD, peut traverser l'année
  readonly displayColor: string;
}

interface LoadProfileAssignmentV1 {
  readonly periodId: string;
  readonly dayGroupId: string;
  readonly profileId: string;
}
```

Invariants : partition exacte des sept jours lorsqu’il existe plusieurs groupes ;
`periods` utilise un groupe `all-days` ; couverture exacte de l’année ; unicité
du couple `(periodId, dayGroupId)` ; profil direct existant pour chaque couple.

## DirectDailyLoadProfileV2

```ts
interface DirectDailyLoadProfileV2 {
  readonly id: string;
  readonly name: string;
  readonly hourlyPoints: readonly HourlyLoadPointV1[]; // 24
  readonly provenance: ProfileProvenanceV1;
}

interface HourlyLoadPointV1 {
  readonly hourIndex: number; // entier 0..23
  readonly activePowerW: number; // >= 0
  readonly peakPowerW: number | null; // null ou >= activePowerW
}
```

À la normalisation, `peakPowerW = null` devient `activePowerW` et produit
`PEAK_DEFAULTED_TO_AVERAGE`. Le profil direct ne contient jamais équipements,
facture, durée d’usage, rendement ou coefficient de démarrage.

## ComposedLoadDraftV1

```ts
interface ComposedLoadDraftV1 {
  readonly baseProjectUpdatedAtIso: string;
  readonly initial: ComposedAnnualLoadV2 | null;
  readonly candidate: ComposedAnnualLoadV2;
  readonly migration: {
    readonly retainedProfileIds: readonly string[];
    readonly copiedProfileIds: readonly string[];
    readonly orphanedProfileIds: readonly string[];
  };
  readonly validation: ComposerValidationV1;
  readonly dirty: boolean;
}

type ComposerValidationV1 =
  | { readonly status: 'valid'; readonly warnings: readonly ComposerIssueV1[] }
  | { readonly status: 'invalid'; readonly issues: readonly ComposerIssueV1[] };
```

Le brouillon est créé à l’ouverture du dialogue. `Cancel` le détruit. `Apply`
vérifie la révision du projet, normalise les pointes, valide toutes les
combinaisons puis remplace atomiquement la branche composée.

## EquipmentLoadRowV2

```ts
interface EquipmentLoadRowV2 {
  readonly id: string;
  readonly label: string;
  readonly quantity: number;                 // entier >= 1
  readonly usefulPowerW: number;             // > 0
  readonly efficiencyRatio: number;          // ]0, 1]
  readonly startupPowerMultiplier: number | null; // null ou >= 1
  readonly durationHours: number;             // [0, 24]
  readonly hourlyOperatingFractions: readonly number[]; // 24 × [0,1]
}
```

`simultaneityRatio` est absent de V2 pour ce flux. Les puissances et énergies
dérivées restent des sorties du moteur.

## AnnualLoadSeriesV1

```ts
interface AnnualLoadPointV1 {
  readonly timestampUtcIso: string;
  readonly localDateIso: string;
  readonly localHourIndex: number;
  readonly periodId: string;
  readonly dayGroupId: string;
  readonly profileId: string;
  readonly activeEnergyWh: number;
  readonly peakPowerW: number;
}

interface AnnualLoadSeriesV1 {
  readonly timezoneIana: string;
  readonly points: readonly AnnualLoadPointV1[];
}
```

La série utilise les horodatages météo comme squelette et doit avoir la même
longueur que la série POA validée.

## AnnualChartQueryV1 et AnnualChartSeriesV1

```ts
type AnnualChartRangeV1 =
  | { readonly kind: 'year' }
  | { readonly kind: 'period'; readonly periodId: string }
  | { readonly kind: 'month'; readonly year: number; readonly month: number }
  | { readonly kind: 'week'; readonly startLocalDateIso: string }
  | { readonly kind: 'day'; readonly localDateIso: string }
  | { readonly kind: 'custom-range'; readonly startLocalDateIso: string; readonly endLocalDateIso: string };

type AnnualChartFrequencyV1 = 'auto' | 'hourly' | 'daily' | 'weekly' | 'monthly';

interface AnnualChartQueryV1 {
  readonly range: AnnualChartRangeV1;
  readonly frequency: AnnualChartFrequencyV1;
  readonly visibleSeries: readonly ('average-power' | 'peak-power' | 'energy' | 'poa')[];
}

interface AnnualChartPointV1 {
  readonly intervalStartIso: string;
  readonly intervalEndIso: string;
  readonly energyWh: number;
  readonly averagePowerW: number;
  readonly peakPowerW: number;
  readonly meanPoaWm2: number | null;
  readonly periodIds: readonly string[];
  readonly profileIds: readonly string[];
}

interface AnnualChartSeriesV1 {
  readonly requestedFrequency: AnnualChartFrequencyV1;
  readonly resolvedFrequency: Exclude<AnnualChartFrequencyV1, 'auto'>;
  readonly range: AnnualChartRangeV1;
  readonly points: readonly AnnualChartPointV1[];
  readonly sourcePointCount: number;
}
```

Règles : la requête ne modifie pas `AnnualLoadSeriesV1` ; énergie = somme ;
puissance moyenne = énergie divisée par la durée totale ; pointe = maximum.
La réduction de rendu éventuelle conserve au minimum premier, dernier, minimum
et maximum par bucket et n’est jamais exposée comme donnée exportable.

## AnnualYEnResultV1

```ts
interface LocalYEnContributionV1 {
  readonly periodId: string;
  readonly dayGroupId: string;
  readonly dayCount: number;                 // N[p,t]
  readonly dailyTotalLoadEnergyWh: number;   // Eload,T,p,t
  readonly meanDailyFavorableLoadEnergyWh: number; // Eload,f,p,t sur les jours réels
  readonly localGammaRatio: number;          // gamma[p,t]
  readonly annualEnergyWeightWh: number;     // W[p,t]
  readonly weightedGammaEnergyWh: number;    // W * gamma
}

interface AnnualYEnResultV1 {
  readonly status: 'available';
  readonly annualGammaRatio: number;
  readonly numeratorWh: number;
  readonly denominatorWh: number;
  readonly contributions: readonly LocalYEnContributionV1[];
}
```

Un dénominateur nul produit un état discriminé `unavailable`, pas ce type.

## ImportInspectionV1

```ts
interface ImportCellIssueV1 {
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly sheetName: string;
  readonly rowNumber: number;
  readonly columnName: string;
  readonly cellAddress: string;
  readonly receivedValue: unknown;
  readonly expectedMessageKey: string;
}

type ImportInspectionV1<T> =
  | { readonly status: 'valid'; readonly candidate: T; readonly warnings: readonly ImportCellIssueV1[] }
  | { readonly status: 'invalid'; readonly issues: readonly ImportCellIssueV1[] };
```

Seul `valid` peut atteindre une commande de commit.

## CountryReferenceV1 et LocalizedLocalityV1

```ts
interface CountryReferenceV1 {
  readonly alpha2: string;
  readonly alpha3: string;
  readonly names: { readonly fr: string; readonly en: string };
  readonly snapshotVersion: string;
}

interface LocalizedLocalityV1 {
  readonly id: string;
  readonly countryCode: string;
  readonly nameOriginal: string;
  readonly names: { readonly fr: string | null; readonly en: string | null };
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
  readonly timezoneIana: string;
  readonly providerRefs: readonly { readonly provider: string; readonly id: string | null }[];
}
```

## WeatherLibraryRecordV2

```ts
interface WeatherLibraryRecordV2 {
  readonly id: string;
  readonly localityId: string;
  readonly source: {
    readonly provider: string;
    readonly endpoint: string;
    readonly datasetVersion: string;
    readonly retrievedAtIso: string;
  };
  readonly sourceSha256: string;
  readonly timezoneIana: string;
  readonly hourlyObservations: readonly SolarIrradianceObservationV1[];
}
```

## ExternalDataGatewayConfigV1

```ts
type ExternalDataGatewayConfigV1 =
  | { readonly mode: 'vite-development'; readonly baseUrl: string }
  | { readonly mode: 'web-gateway'; readonly baseUrl: string }
  | { readonly mode: 'tauri-http' }
  | { readonly mode: 'unconfigured' };
```

Le mode fait partie de l’adaptateur de plateforme, pas du projet exporté.

## Persistance SQLite cible

Tables minimales :

- `projects(id, name, system_kind, schema_version, updated_at, canonical_json)` ;
- `project_revisions(id, project_id, created_at, canonical_json, input_hash)` ;
- `localities(id, country_code, original_name, name_fr, name_en, latitude, longitude, timezone)` ;
- `weather_records(id, locality_id, provider, retrieved_at, sha256, canonical_json)` ;
- `project_weather(project_id, weather_record_id)` ;
- `profile_templates(id, name, canonical_json, updated_at)`.

Le JSON canonique reste validé avant et après lecture. Les tables ne redéfinissent
pas les formules ou la structure métier du projet.

## Migration V1 → V2

- accepter puis ignorer `details.projectImageRef` avec une entrée de migration ;
- convertir le besoin existant vers `LoadDefinitionV2.simple` et
  `activeMode = simple` ;
- convertir les profils existants sans perdre équipement, horaire ou facture ;
- ne créer `composed` qu’après validation explicite du dialogue ;
- convertir `simultaneityRatio = 1` en absence du champ ;
- refuser ou signaler toute ancienne valeur différente de 1 avant suppression ;
- ne pas activer une organisation multi-profils sans affectations complètes.
- migrer un ancien `workweek-weekend` compatible vers deux profils directs ;
- traiter toute ancienne composition contenant équipement/facture comme
  `migration-required`, sans l’activer silencieusement.
