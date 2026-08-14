# Convergence — AIO Core

**Date**: 2026-08-14
**Statut**: ⚠️ code convergé — feature en attente d'approbation golden humain `T021`

## Résultat

Les écarts `T022` à `T027` sont fermés. Le protocole public générique est de nouveau exclusivement asynchrone; l'extension AIO conserve un cœur synchrone pur. Les entrées invalides sont classées par chemin et ne bloquent que les sorties dépendantes. Les payloads non canoniques produisent une enveloppe déterministe et sérialisable avec un identifiant `diagnostic-fnv1a64:*`, distinct du hash technique `fnv1a64:*`.

Le moteur reste limité à `CALC-AIO-001..007`. Aucun code UI, format projet public, catalogue, source scientifique, legacy ou golden n'a été modifié.

## Matrice contrainte → sorties bloquées

| Contrainte | Sorties bloquées |
|---|---|
| `AIO_INVALID_REQUEST_SHAPE`, `AIO_INVALID_PROVENANCE` | les 10 sorties |
| `AIO_INVALID_HOURLY_SERIES` | toutes sauf `designPeakSunHoursHPerDay` |
| `AIO_INVALID_STARTUP_EVENT`, `AIO_MISSING_STARTUP_MULTIPLIER` | `minimumInverterSurgeAcPowerW` |
| `AIO_INVALID_SOLAR_RESOURCE`, `AIO_MISSING_SOLAR_RESOURCE` | `designPeakSunHoursHPerDay`, `minimumPvStcPowerW` |
| `AIO_MISSING_INVERTER_EFFICIENCY` | DC, PV, stockage utile et nominal |
| `AIO_MISSING_PV_PERFORMANCE_RATIO` | PV |
| `AIO_MISSING_AUTONOMY_DAYS` | stockage utile et nominal |
| DoD/rendement de décharge invalides ou absents | stockage nominal Wh et Ah |
| tension nominale invalide ou absente | capacité nominale Ah seulement |
| chimie batterie invalide/non-plomb | stockage nominal Wh et Ah |
| `AIO_INVALID_TECHNICAL_CONTEXT` | aucune sortie si le champ est inutilisé; PSH/PV si l'orientation utilisée est invalide |
| `AIO_MISSING_ASSUMPTION_SOURCE` | uniquement les descendants de l'hypothèse non sourcée |

## Assurance KSD

### `ksd-calculation-test`

- `US1..US3`, `FR-001..FR-010` et `CALC-AIO-001..007` sont reliés à des tests réels dans `contracts/calculation-register.md`.
- Cas nominaux, zéro, bornes, valeurs absentes/négatives/non finies, dépendances croisées, déterminisme, unités, traces, provenance et comparaison legacy non normative couverts.
- Propriétés fast-check : conservation, non-négativité, monotonicité/inverse-monotonicité et déterminisme des identifiants diagnostiques.
- Incertitude scientifique restante : aucun cas golden AIO indépendant n'a encore été approuvé.

### `ksd-spec-audit`

- Un seul identifiant roadmap immuable : `AIO-001`.
- Périmètre et exclusions SIM/EQP/SAFE/FIN/DOC explicites et testés.
- Unknown/missing/null/zero/négatif/bornes/non-fini/timezone/doublons/chimie incompatible couverts par schémas, contraintes ou tests. Leap-year non applicable au contrat journalier canonique AIO v1.
- Aucun défaut legacy, fallback métier ou hypothèse silencieuse préservé.
- Finding restant : `T021`, baseline golden humaine, déjà tracé; aucune nouvelle tâche requise.

### `$speckit-converge`

- 10 exigences fonctionnelles, 9 critères d'acceptation, décisions du plan et 6 principes constitutionnels contrôlés.
- Aucun écart de code `missing`, `partial`, `contradicts` ou `unrequested` non déjà tracé.
- Aucune nouvelle phase/tâche ajoutée. `T021` reste la seule porte scientifique ouverte.

## Gates exécutés

| Commande | Résultat exact |
|---|---|
| `pnpm test:unit` | 22 fichiers, 82 tests passés |
| `pnpm test:property` | 3 fichiers, 9 tests passés |
| `pnpm test:golden` | 1 test structurel passé; 0 cas AIO dans le manifeste |
| `pnpm verify:phase` | lint, typecheck, contrats UI, 82 unitaires, 9 propriétés, 5 data : vert |
| `pnpm verify` | 33 fichiers / 105 tests sous couverture, 10 intégrations, build production et 18 tests navigateur : vert |

Couverture globale : 92,45 % statements, 85,77 % branches, 94,85 % fonctions et 96,02 % lignes.

## Golden — décision humaine requise

`test-data/golden/manifest.json` reste inchangé avec `cases: []`. Son SHA-256 structurel actuel est `80c7f128eb23de932077af31c80846c6cf1b56d23ae6f38af92d58a99ddf3aa4`; ce hash n'est pas une preuve golden AIO.

Pour fermer `T021`, il faut approuver explicitement au moins un cas indépendant comprenant les entrées, le calcul manuel, les sources `SRC-AIO-*`, le relecteur et la date. Jusqu'à cette décision, le code est convergé mais la feature AIO-001 ne doit pas être déclarée scientifiquement verte ni servir de base à l'intégration UI.
