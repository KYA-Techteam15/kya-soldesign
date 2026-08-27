# Data Model — Dimensionnement détaillé et sécurité électrique

## 1. EconomicAssumptionsV2

| Champ | Type logique | Règle |
|---|---|---|
| currencyCode | code ISO | obligatoire |
| pvSpecificCostMinorPerKw | entier nullable | >= 0 |
| storageSpecificCostMinorPerKwh | entier nullable | >= 0 |
| inverterSpecificCostMinorPerKw | entier nullable | >= 0 |
| pvMarginRatio | ratio nullable | plage approuvée |
| storageMarginRatio | ratio nullable | plage approuvée |
| inverterMarginRatio | ratio nullable | plage approuvée |
| gridEmissionKgCo2PerKwh | nombre nullable | >= 0 |
| provenanceByField | map | `company-default` ou `project-override`, version et date |

`batteryNominalVoltageV` n'appartient plus aux hypothèses économiques. La tension reste une caractéristique de l'équipement sélectionné.

## 2. StorageCostConversionDraft

| Champ | Type logique | Règle |
|---|---|---|
| totalPriceMinor | entier nullable | > 0 pour convertir |
| referenceStorageKwh | nombre nullable | > 0 pour convertir |
| resultingSpecificCostMinorPerKwh | entier dérivé | arrondi monétaire versionné |

Le brouillon aide la saisie mais seule la valeur spécifique canonique est requise par le calcul.

## 3. EquipmentRecordV2

Champs communs :

| Champ | Règle |
|---|---|
| id | identifiant stable non vide |
| kind | `pv-module`, `battery` ou `inverter` |
| origin | `kya` ou `user` |
| version | entier positif croissant |
| derivedFromId | nullable ; renseigné lors d'une duplication |
| supersedesVersion | nullable ; version précédente d'une référence utilisateur |
| manufacturer, model | obligatoires |
| provenance | source, version/date, locator et hash si disponible |
| calculationEligibility | `eligible` ou `ineligible` avec codes de champs |
| archivedAt | nullable ; suppression logique utilisateur |

Règles : une origine KYA ne peut être modifiée, archivée ou supprimée ; une édition utilisateur produit une nouvelle version ; une duplication produit un nouvel identifiant d'origine utilisateur.

### Module

Critiques : puissance, Vmp, Voc, Imp, Isc. Compléments : technologie, coefficients Pmax/Voc, NOCT, surface, fiche technique.

### Batterie

Critiques : tension nominale, capacité Ah, énergie nominale Wh, profondeur utile. Compléments : technologie, rendement aller-retour, cycles, fiche technique. L'énergie doit être cohérente avec les valeurs déclarées selon la tolérance approuvée.

### Onduleur AIO

Critiques selon la stratégie : puissance AC, surcharge, tension DC, rendement, tension AC, puissance PV maximale, plage MPPT, Voc maximale, courant/entrées PV, courant de charge, parallélisation. Les champs absents rendent seulement les stratégies qui en dépendent inéligibles et produisent des codes précis.

## 4. EquipmentSnapshotV1

Copie immuable de l'enregistrement et de la version utilisés, enrichie de `capturedAt`, `sourceCatalogVersion` et `snapshotHash`. Une nouvelle version catalogue ne modifie jamais un snapshot.

## 5. SelectionScopeV1

Union discriminée par famille :

- `fixed`: exactement un `equipmentId` et une version ;
- `shortlist`: liste non vide d'identifiants/version ;
- `free`: aucun identifiant, mais filtres admissibles optionnels.

Une requête d'optimisation contient un scope pour chacune des trois familles.

## 6. ManualSizingRunV2

| Groupe | Champs principaux |
|---|---|
| targets | PV kWc, stockage utile kWh, puissance continue et démarrage kW |
| equipment | trois snapshots confirmés |
| pv | Ns, Np, total, puissances, Vmp, Voc froid, Isc, marge |
| storage | Ns, Np, total, énergie nominale, utile et marge |
| inverter | nombre, puissance continue/surcharge obtenue, marge |
| estimate | coûts PV, stockage, onduleur, total principal, total avec marges optionnel, périmètre |
| evidence | validité, issues, warnings, engineVersion, inputHash, trace |

États : `not-run → running → valid|invalid|failed`; toute modification déterminante mène à `stale`.

## 7. OptimizationRequestV1

- `enabled`: doit être vrai pour exécuter ;
- trois `SelectionScopeV1` ;
- `objective`: `closest`, `lowest-main-equipment-cost`, `fewest-components` ;
- limites optionnelles de surdimensionnement PV, stockage et onduleur ;
- cibles et hypothèses économiques versionnées.

## 8. OptimizationCandidateV1

Contient un `ManualSizingRunV2` valide plus : rang, écarts relatifs, maximum et somme des écarts, nombre total de composants, clé de départage, justification et statut d'application. Une liste de résultats ne modifie pas le projet. L'état passe de `proposed` à `applied` uniquement par confirmation.

## 9. ProtectionRequirementV1

| Champ | Règle |
|---|---|
| segment | `pv-inverter`, `inverter-battery`, `inverter-load` |
| allowedTypes | sous-ensemble imposé par le segment |
| minimumCurrentA | positif |
| maximumCurrentA | nullable ; si présent strictement >= minimum |
| serviceVoltageV | positif |
| quantity | entier positif dérivé |
| methodVersion, inputHash, trace | obligatoires |

## 10. ProtectionChoiceV2

- segment ;
- selectedType nullable tant que l'utilisateur n'a pas confirmé ;
- compatibleRatingsA ordonnés ;
- selectedRatingA nullable ;
- protectedConductors pour batterie lorsque applicable ;
- état `awaiting-type`, `awaiting-rating`, `valid`, `stale`, `unavailable` ;
- diagnostics et références à l'exigence.

Transition :

```text
awaiting-type → awaiting-rating → valid
      ↑               ↑             ↓
      └──────────── stale ← changement amont
```

## 11. CableInputV2

Exactement quatre champs utilisateur par segment :

- `lengthM` > 0 ;
- `material`: cuivre ou aluminium ;
- `installation`: enterré ou non enterré ;
- `maxVoltageDropPercent` > 0 dans la plage approuvée.

## 12. CableResultV2

- valeurs amont dérivées : courant, tension, type/calibre de protection ;
- section thermique minimale ;
- section minimale par chute ;
- contrainte déterminante ;
- section normalisée retenue ;
- chute réelle ;
- conformité, warnings, version, inputHash et trace.

États : `blocked` sans protection valide ou entrée complète ; `valid` si une section normalisée satisfait ; `unavailable` si aucune section ne satisfait ; `stale` après changement amont.

## 13. ProjectDetailedSizingV1

Agrégat persistant contenant hypothèses économiques, snapshots manuels, configuration d'optimisation, dernière liste de candidats, choix appliqué, trois choix de protection et trois couples entrée/résultat câble. Les résultats sont invalidés en cascade :

```text
prédimensionnement/catalogue sélectionné
  → dimensionnement détaillé
    → protections
      → câbles
```
