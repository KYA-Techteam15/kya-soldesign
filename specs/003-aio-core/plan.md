# Plan d'implémentation AIO-001

## Contexte technique

| Sujet | Décision |
|---|---|
| Langage/runtime | TypeScript pur dans `packages/engine`; validation runtime et unités dans `packages/domain` |
| API | `AioSizingEngineV1.calculate` synchrone et sans effets de bord |
| Contrats | `AioSizingRequestV1` / `AioSizingEnvelopeV1`, JSON sérialisable |
| Hash | canonique stable des seules entrées techniques validées |
| Tests | Vitest + fast-check + goldens revus + legacy non normatif |
| UI | aucune modification dans AIO-001; un adaptateur de frontière peut être préparé sans import UI |

## Constitution check

- Vérité : aucune donnée défaut, aucune sortie simulée; l'indisponible devient une contrainte.
- Pureté : pas d'import UI/parent, pas de réseau/horloge/stockage/locale.
- Traçabilité : unités, hash, version, provenance, warnings, contraintes et traces obligatoires.
- Assurance : tests avant code, goldens revus séparément du legacy.
- Indépendance : pas de chemin parent ni module Python runtime.
- Discipline : limites SIM/EQP/SAFE/FIN/DOC définies et testées.

Toutes les portes sont **PASS** au niveau de conception. Toute extension de chimie ou baseline golden est une porte d'approbation humaine, conformément à la Constitution.

## Architecture cible

```text
packages/domain/src/aio.ts                 schémas, unités, types, provenance
packages/engine/src/aio/normalize.ts       validation et canonicalisation de frontière
packages/engine/src/aio/calculations.ts    CALC-AIO-001..007 purs
packages/engine/src/aio/engine.ts          orchestration, contraintes, traces, hash
packages/engine/src/aio/index.ts           export public
packages/engine/src/aio/__tests__/          tests unit/property/golden/legacy
```

Le détail final des noms de fichiers peut suivre les conventions existantes, mais les responsabilités ci-dessus sont obligatoires. Aucun changement de `apps/desktop` ou format projet public ne fait partie du lot.

## Phases

1. **Fondation contractuelle** — unités complémentaires, schémas runtime stricts, normalisation et hash stable.
2. **Calculs test-first** — tests des sept règles puis fonctions pures et traces unitaires.
3. **Orchestration** — enveloppe complète, propagation de contraintes par sortie, version/provenance/warnings.
4. **Assurance** — goldens indépendants, propriétés, sensibilités et comparaison legacy étiquetée.
5. **Intégration contrôlée** — exports, documentation de package, `pnpm verify:phase`, audit KSD, puis `pnpm verify` et convergence Spec Kit.

## Aucune migration UI

L'UI possède actuellement des champs plus larges (coûts, sécurité, météo partielle, `batteryEfficiencyRatio` ambigu). Les adapter vers AIO exige:

1. une valeur techniquement définie et sourcée;
2. une conversion explicitement testée;
3. une contrainte en cas d'absence;
4. une feature UI ultérieure approuvée.

Il est interdit de rendre ces champs non nullables par valeur par défaut afin de « faire marcher » l'AIO.
