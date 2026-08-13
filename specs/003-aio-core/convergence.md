# Convergence — AIO Core

**Date**: 2026-08-13  
**Statut**: ❌ non convergé — corrections de contrat/frontière T022–T027 et golden humain T021 requis

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

## Audit Sol High du commit `565d646`

Les gates existantes sont vertes, mais elles ne prouvent pas encore la conformité complète. L'audit a reproduit les écarts suivants :

| Gravité | Écart | Preuve observée |
|---|---|---|
| bloquant | contrat DATA-001 modifié sans autorisation | `CalculationEngine.calculate` a été élargi de `Promise<...>` vers sync-ou-async dans `packages/engine/src/engine.ts` |
| majeur | mauvais code de contrainte et blocage excessif | latitude `91`, événement startup `hourIndex=24` et provenance SHA invalide deviennent tous `AIO_INVALID_HOURLY_SERIES` et bloquent les dix sorties |
| majeur | récupération non exhaustive des entrées invalides | la classification dépend de quelques chemins supprimés manuellement au lieu d'une matrice de dépendances complète |
| majeur | assurance incomplète | aucun golden AIO, tests `G-*` absents et T005–T007/T014 ouverts |
| mineur | traçabilité des tâches | T020 avait disparu et les chemins de tests réels ne correspondent pas aux chemins annoncés dans les tâches |

Les corrections normatives sont maintenant décrites dans `contracts/engine-api.md` et planifiées par T022–T027. `pnpm verify:phase` reste vert après ces corrections documentaires : 63 tests unitaires, 8 propriétés et 5 tests de données.

## Golden — décision humaine requise

`test-data/golden/manifest.json` est structurellement valide mais ne contient aucun cas. La spécification exige au moins un cas AIO avec calcul manuel, sources `SRC-AIO-*`, hash, traces, identité et date du relecteur. Ajouter ou modifier ce jeu crée une baseline scientifique : la Constitution et le goal interdisent à l'agent de le faire sans approbation humaine explicite.

Le hash du manifeste actuel est donc non applicable à AIO : il ne contient pas de cas AIO. Après approbation et ajout, consigner ici le SHA-256 du fichier golden et du manifeste, le relecteur et la date.

## Résultat de convergence

La convergence de code n'est pas complète tant que T022–T027 restent ouvertes. Même après leur correction, la feature ne sera déclarée verte que lorsque `T014`/`T021` disposeront d'un golden approuvé. Aucune intégration UI ne doit démarrer depuis ce goal.
