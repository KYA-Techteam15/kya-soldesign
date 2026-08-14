# Convergence — AIO Core

**Date**: 2026-08-14
**Statut**: ✅ convergé — code, assurance scientifique et golden humain approuvé

## Résultat

Les écarts `T022` à `T027` sont fermés. Le protocole public générique est de nouveau exclusivement asynchrone; l'extension AIO conserve un cœur synchrone pur. Les entrées invalides sont classées par chemin et ne bloquent que les sorties dépendantes. Les payloads non canoniques produisent une enveloppe déterministe et sérialisable avec un identifiant `diagnostic-fnv1a64:*`, distinct du hash technique `fnv1a64:*`.

Le moteur reste limité à `CALC-AIO-001..007`. Aucun code UI, format projet public, catalogue, source scientifique ou legacy n'a été modifié. Le seul ajout scientifique est le golden `AIO-G-001` explicitement approuvé.

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
- Golden `AIO-G-001` : dix sorties vérifiées contre dix calculs manuels, couvrant `CALC-AIO-001..007` et `SRC-AIO-001..005`.
- Limite conservée : le golden est un cas analytique, pas une donnée météo/site réelle ni une validation de fiabilité.

### `ksd-spec-audit`

- Un seul identifiant roadmap immuable : `AIO-001`.
- Périmètre et exclusions SIM/EQP/SAFE/FIN/DOC explicites et testés.
- Unknown/missing/null/zero/négatif/bornes/non-fini/timezone/doublons/chimie incompatible couverts par schémas, contraintes ou tests. Leap-year non applicable au contrat journalier canonique AIO v1.
- Aucun défaut legacy, fallback métier ou hypothèse silencieuse préservé.
- Aucun finding restant dans le périmètre AIO-001.

### `$speckit-converge`

- 10 exigences fonctionnelles, 9 critères d'acceptation, décisions du plan et 6 principes constitutionnels contrôlés.
- Aucun écart de code `missing`, `partial`, `contradicts` ou `unrequested` non déjà tracé.
- Aucune nouvelle phase/tâche ajoutée. `T021` est fermé par la revue explicite du cas `AIO-G-001`.

## Gates exécutés

| Commande | Résultat exact |
|---|---|
| `pnpm test:unit` | 22 fichiers, 82 tests passés |
| `pnpm test:property` | 3 fichiers, 9 tests passés |
| `pnpm test:golden` | 2 fichiers, 2 tests passés; 1 cas AIO approuvé dans le manifeste |
| `pnpm verify:phase` | lint, typecheck, contrats UI, 82 unitaires, 9 propriétés, 5 data : vert |
| `pnpm verify` | 34 fichiers / 106 tests sous couverture, 10 intégrations, build production et 18 tests navigateur : vert |

Couverture globale : 92,45 % statements, 85,77 % branches, 94,85 % fonctions et 96,02 % lignes.

## Golden approuvé

Le responsable du projet a approuvé le cas exact dans le chat Codex le 2026-08-14; la revue est enregistrée à `2026-08-14T03:49:27.118Z`.

- input : `e7428933034f126deb95e7c6afb8bfba53223fe76f6b8251118c18ccae2231be`;
- expected : `a08cc0c918484e3e428ed009fc974efcccd85b4c3d06d116b3b143530356635a`;
- manifest : `acd8216fdbcbaa5a6b7ad539841dcf342ced34bbd8fef0be1017ef3b93a5e5cf`;
- identité technique attendue : `fnv1a64:5c43514c9895d02a`.

AIO-001 est désormais utilisable comme cœur normatif pour la future intégration UI. Les projets réels devront toujours fournir leurs propres charges, ressource solaire et hypothèses sourcées; aucune valeur du golden ne devient une valeur par défaut de production.
