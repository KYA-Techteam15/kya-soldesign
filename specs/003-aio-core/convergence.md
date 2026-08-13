# Convergence — AIO Core

**Date**: 2026-08-13  
**Statut**: ⚠️ code et gates verts; convergence finale en attente du golden AIO approuvé

## Implémentation vérifiée

- Contrats AIO v1 stricts, unités canoniques, normaliseurs DATA-001 et hash stable.
- Moteur synchrone, pur et sérialisable pour `CALC-AIO-001` à `CALC-AIO-007`.
- Sorties partielles avec contraintes stables, warnings, provenance dédupliquée et traces formule/source/valeurs.
- Aucun import UI, legacy ou parent; aucune sortie SIM/EQP/SAFE/FIN/DOC.
- Les hypothèses et ressource POA absentes, invalides ou sans provenance bloquent seulement leurs dépendances; aucune valeur n'est inventée.

## Audit KSD

| Audit | Résultat | Preuve |
|---|---|---|
| `ksd-calculation-test` | vert hors golden approuvé | unités, frontières, propriétés, déterminisme, legacy non normatif et registre `CALC-AIO-001..007` couverts |
| `ksd-spec-audit` | vert avec une réserve | unités, sources, inconnus, out-of-scope et contrats observables; réserve `G-*` ci-dessous |
| `pnpm verify:phase` | vert | lint, typecheck, contrôles UI invariants, 63 tests unitaires, 8 propriétés, 5 données |
| `pnpm verify` | vert | 85 tests totaux sous couverture, build production et 18 tests navigateur |
| `$speckit-converge` | 1 tâche ajoutée | T021 — baseline golden AIO indépendante et revue par un humain |

## Golden — décision humaine requise

`test-data/golden/manifest.json` est structurellement valide mais ne contient aucun cas. La spécification exige au moins un cas AIO avec calcul manuel, sources `SRC-AIO-*`, hash, traces, identité et date du relecteur. Ajouter ou modifier ce jeu crée une baseline scientifique : la Constitution et le goal interdisent à l'agent de le faire sans approbation humaine explicite.

Le hash du manifeste actuel est donc non applicable à AIO : il ne contient pas de cas AIO. Après approbation et ajout, consigner ici le SHA-256 du fichier golden et du manifeste, le relecteur et la date.

## Résultat de convergence

La convergence de code est complète. La convergence de feature n'est **pas** déclarée verte tant que `T014`/`T021` ne disposent pas du golden approuvé. Aucune intégration UI ne doit démarrer depuis ce goal.
