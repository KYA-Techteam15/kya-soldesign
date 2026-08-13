# Modèle de données AIO v1

## Séparation des données

| Classe | Exemples | Dans le moteur/hash |
|---|---|---|
| Administratif | client, contacts, image, adresse postale, numéro commercial | non |
| Contexte technique | type d'application, site, orientation, étude | oui, si utilisé pour une règle/provenance |
| Mesure saisie | appareil, facture, puissance, série météo | oui |
| Valeur dérivée de frontière | série issue d'une facture, conversion W→Wh | oui avec méthode/provenance |
| Résultat moteur | besoin/predimensionnement, warnings, trace | sortie seulement |

## Réemploi obligatoire du modèle existant

L'AIO ne recrée pas les fondations DATA-001. Terra doit importer et composer les contrats existants, puis ajouter seulement les écarts qui n'y figurent pas encore.

| Besoin AIO | Autorité existante à réemployer | Extension réellement permise |
|---|---|---|
| unités W, Wh, V, h et conversions | `packages/domain/src/units.ts` | ajouter seulement Ah, ratio, jours et kWh/m²/j, au même module |
| appareils et fractions horaires | `LoadItem`, `hourlyOperatingFractionsSchema`, `deriveDailyLoadEnergyWh` dans `packages/domain/src/load.ts` | un adaptateur vers la charge journalière AIO; aucun second schéma d'appareil |
| profil de facture | `NormalizedHourlyProfile` et `normalizeHourlyEnergyWeights` dans `packages/domain/src/load.ts` | contrat de période de facture, pas un nouveau profil à 24 poids |
| localité, source et série météo | `Locality`, `WeatherSource`, `WeatherSeries`, validateurs dans `packages/domain/src/weather.ts` | projection POA de conception avec méthode/version, sans dupliquer la série |
| provenance de données | `provenanceSchema` dans `packages/domain/src/weather.ts` | métadonnées AIO seulement si nécessaires à une hypothèse/source scientifique |
| issues et trace minimale | `CalculationIssue`, `CalculationTraceEntry`, `CalculationEnvelope` dans `packages/domain/src/contracts.ts` | enveloppe AIO qui enrichit le contrat sans réécrire ses notions |
| protocole moteur | `CalculationRequest` / `CalculationEngine` dans `packages/engine/src/engine.ts` | spécialisation AIO; pas de second protocole moteur concurrent |

## Alias TypeScript sérialisables attendus

Ces noms représentent des spécialisations ou les seules unités absentes. Ils complètent les types brandés existants, jamais ne les remplacent.

```ts
type Watt = number;                 // suffixe W, >= 0
type WattHour = number;             // suffixe Wh, >= 0
type AmpereHour = number;           // suffixe Ah, >= 0
type Volt = number;                 // suffixe V, > 0
type KilowattHourPerM2PerDay = number; // suffixe KWhPerM2PerDay, > 0
type Ratio = number;                // suffixe Ratio, 0 < x <= 1
type DayCount = number;             // suffixe Days, entier >= 0
```

Les objets traversant une frontière sont JSON purs : nombres finis, chaînes, booléens, tableaux et objets; ni `Date`, ni `Map`, ni `undefined`, ni `NaN`.

## Entités d'entrée

### `AioSizingRequestV1`

| Champ | Type / validation | Rôle |
|---|---|---|
| `schemaVersion` | littéral `1` | version de contrat |
| `technicalContext` | `TechnicalProjectContextV1` | application/site utiles |
| `load` | `CanonicalDailyLoadV1` | charge canonique obligatoire |
| `solarDesignResource` | `SolarDesignResourceV1` | ressource obligatoire pour PV |
| `assumptions` | `AioAssumptionsV1` | hypothèses explicites |
| `provenance` | `ProvenanceBundleV1` | origine/auteur/date des entrées |

### `TechnicalProjectContextV1`

- `applicationType`: `residential | commercial | industrial | agricultural | other`.
- `site`: `localityId?`, `latitudeDeg? [-90,90]`, `longitudeDeg? [-180,180]`, `arrayTiltDeg [0,90]`, `arrayAzimuthDeg [0,360)`. Inclinaison et azimut sont obligatoires dès qu'une sortie PV est demandée; une localité ou des coordonnées seules restent insuffisantes.
- Localité/coordonnées ne suffisent jamais à fabriquer une ressource solaire.

### `CanonicalDailyLoadV1`

```ts
interface CanonicalDailyLoadV1 {
  basis: 'equipment-schedule' | 'direct-hourly-power' | 'meter-estimate';
  intervalMinutes: 60;
  timezoneIana: string;
  hourlyEnergyWh: readonly WattHour[]; // exactement 24
  startupEvents: readonly StartupEventV1[];
  derivation?: LoadDerivationV1;
}
```

- `hourlyEnergyWh[i]` est l'énergie AC moyenne de l'intervalle `[i:00, i+1:00)`, jamais une fraction indéterminée.
- `equipment-schedule`: compose directement `LoadItem`; par appareil et par heure, `Wh = activePowerW × quantity × simultaneityRatio × operating fraction × 1 h`. La valeur existante `deriveDailyLoadEnergyWh` est la référence de conservation journalière. Les champs UI additionnels (`efficiencyRatio`, démarrage) ne sont admis que par un adaptateur sourcé et sans modifier le schéma `LoadItem`.
- `direct-hourly-power`: `Wh = activePowerW × 1 h`; `peakPowerW` UI, s'il existe, devient un événement de démarrage seulement avec une sémantique/provenance explicite.
- `meter-estimate`: `monthlyEnergyWh` peut dériver `dailyEnergyWh` avec le nombre de jours exact de la période. Il ne peut dériver `hourlyEnergyWh` qu'avec le `NormalizedHourlyProfile` DATA-001 existant, sourcé/versionné. Sans ce profil, le besoin d'énergie est disponible mais le pic et l'onduleur sont bloqués.
- Les granularités annuelle, mensuelle, hebdomadaire, journalière, périodique et combinée restent des données source; l'adaptateur doit documenter la période observée et son passage vers la journée de conception. La simple moyenne d'une granularité saisonnière contradictoire est interdite.

### `StartupEventV1`

| Champ | Validation |
|---|---|
| `hourIndex` | entier 0..23 |
| `runningPowerW` | > 0 |
| `startupPowerMultiplier` | > 1 si inductif; `1` pour aucun supplément |
| `isInductive` | booléen |
| `sourceRef` | identifie l'appareil/saisie |

### `SolarDesignResourceV1`

| Champ | Validation / règle |
|---|---|
| `selectionMethod` | `declared-critical-month`; l'AIO v1 ne choisit pas à la place de l'utilisateur |
| `referencePeriod` | `{ yearOrTypicalPeriod, month: 1..12 }` |
| `planeOfArrayIrradiationKWhPerM2PerDay` | fini `> 0`; sur le même plan que l'orientation fournie |
| `arrayTiltDeg`, `arrayAzimuthDeg` | égalité avec le contexte technique ou écart déclaré/justifié |
| `source` | fournisseur, identifiant de dataset, version, URL/URI, récupération, licence si connue |
| `timeConvention` | obligatoire si issu d'une série : fuseau IANA, début/centre/fin d'intervalle, pas, période |
| `qualityFlags` | observations source conservées |

Un import futur doit d'abord passer `validateWeatherSeries` et `validateWeatherSeriesAssociation` DATA-001. L'AIO ajoute seulement le contrôle de la projection POA de conception : timestamp non monotone, pas irrégulier non déclaré, unité inconnue, période manquante, valeurs non finies, coordonnées inconnues ou confusion GHI/POA. La conversion GHI→POA est hors AIO v1 : la frontière doit fournir POA déjà calculée et sa méthode, ou laisser la donnée indisponible.

### `AioAssumptionsV1`

| Champ | Validation | Sorties dépendantes |
|---|---|---|
| `inverterEfficiencyRatio` | `0 < x ≤ 1` | énergie DC/PV/stockage |
| `pvPerformanceRatio` | `0 < x ≤ 1` | PV STC |
| `autonomyDays` | entier `≥0` | stockage |
| `batteryChemistry` | `lead-acid | other | unknown` | capacité nominale/Ah |
| `depthOfDischargeRatio` | `0 < x ≤ 1`, plomb seulement | capacité nominale/Ah |
| `batteryDischargeEfficiencyRatio` | `0 < x ≤ 1`, plomb seulement | capacité nominale/Ah |
| `batteryNominalVoltageV` | fini `>0`, plomb seulement | Ah |
| `assumptionSources` | provenance une entrée par hypothèse | toutes |

`batteryEfficiencyRatio` de l'UI actuelle ne peut être adapté que si sa définition est explicitement « rendement de décharge ». Une efficacité round-trip reste différente et doit être rejetée pour `batteryDischargeEfficiencyRatio`.

## Sorties et états

Une sortie est soit `{ status: 'available', value, unit, traceIds }`, soit `{ status: 'blocked', constraintIds }`. Cela interdit de confondre `0` et l'inconnu.

| Sortie | Unité | Dépendances |
|---|---|---|
| `dailyAcEnergyWh` | Wh | charge canonique |
| `peakCoincidentAcPowerW` | W | 24 intervalles |
| `dailyDcEnergyWh` | Wh | énergie AC, rendement onduleur |
| `designPeakSunHoursHPerDay` | h/j | ressource POA |
| `minimumPvStcPowerW` | W | DC, PSH, PR |
| `minimumUsableStorageWh` | Wh | DC, autonomie |
| `minimumLeadAcidNominalStorageWh` | Wh | utile, chimie/DoD/rendement |
| `minimumLeadAcidNominalCapacityAh` | Ah | nominale, V |
| `minimumInverterContinuousAcPowerW` | W | pic coïncident |
| `minimumInverterSurgeAcPowerW` | W | événements démarrage complets |

## Provenance, warnings et contraintes

`ConstraintViolationV1` doit étendre `CalculationIssue` avec `blocksOutputIds`; `FormulaTraceV1` doit étendre `CalculationTraceEntry` avec les valeurs substituées et accepter `sourceIds` en plus du `sourceId` minimal. La provenance de données réutilise `provenanceSchema`; les métadonnées documentaires additionnelles restent dans les entrées d'hypothèse, pas dans un second modèle générique de provenance.

Les warnings sont non bloquants (p. ex. `AIO_ZERO_LOAD`, « irradiation sélectionnée manuellement »). Les contraintes `error` bloquent les sorties concernées et sont stables par code.
