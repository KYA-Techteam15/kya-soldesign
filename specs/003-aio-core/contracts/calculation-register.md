# Registre de calcul normatif AIO v1

| Formula ID | Statut | Règle | Entrées / unités | Sortie | Sources | Limites et warning | Tests |
|---|---|---|---|---|---|---|---|
| `CALC-AIO-001` | retain | somme énergie/pic horaire | 24 `hourlyEnergyWh`; Wh | Wh, W | `SRC-AIO-003` | moyenne par heure, pas transitoire | U-001, B-001, P-001, G-001 |
| `CALC-AIO-002` | retain | énergie DC = énergie AC / η onduleur | Wh, ratio | Wh | `SRC-AIO-002` | η obligatoire, `(0,1]` | U-002, B-002, P-002, G-002 |
| `CALC-AIO-003` | retain | PSH = H_POA / 1 kW/m² | kWh/m²/j | h/j | `SRC-AIO-002`, `SRC-AIO-003` | POA réel et période déclarée | U-003, B-003, G-003 |
| `CALC-AIO-004` | correct | PV STC = E_DC/(PSH×PR) | Wh/j, h/j, ratio | W | `SRC-AIO-001`, `SRC-AIO-002` | pas de garantie de fiabilité | U-004, B-004, P-004, G-004 |
| `CALC-AIO-005` | correct | stockage utile = E_DC×jours autonomie | Wh/j, jours | Wh | `SRC-AIO-002`, `SRC-AIO-004` | autonomie est une hypothèse, non LPSP | U-005, B-005, P-005, G-005 |
| `CALC-AIO-006` | correct | stockage plomb nominal / Ah | Wh, ratios, V | Wh, Ah | `SRC-AIO-001`, `SRC-AIO-005` | plomb seulement, pas round-trip implicite | U-006, B-006, P-006, G-006 |
| `CALC-AIO-007` | correct | pic continu/démarrage | W, multiplicateur | W | `SRC-AIO-004` | multiplicateur inductif obligatoire | U-007, B-007, P-007, G-007 |

## Références de test

| ID | Catégorie | Attendu revu |
|---|---|---|
| `U-*` | unité | formule exacte et identité d'unité |
| `B-*` | frontière | zéro valide, ratios limites, champs manquants, non-finis |
| `P-*` | propriété fast-check | non-négativité, monotonicité, permutation d'agrégation, déterminisme |
| `G-*` | golden | calcul manuscrit revu contre les règles et sources de ce registre |
| `L-*` | comparaison legacy | écart documenté; jamais baseline normative |

Tout changement d'un `G-*`, d'une source ou d'une règle passe par approbation humaine et met à jour ce registre avant le code.

## Matrice de preuve réellement versionnée

| Exigences / scénarios | Règles | Fichiers de preuve |
|---|---|---|
| `US1`, `FR-001`, `FR-007`, `FR-009` | frontières, validation, hash | `packages/domain/src/__tests__/aio.test.ts`; `packages/engine/test/unit/aio.input-hash.unit.test.ts`; `packages/engine/test/unit/aio.boundary.unit.test.ts` |
| `US2`, `FR-002..FR-006` | `CALC-AIO-001..007` | `packages/engine/test/unit/aio.calculations.unit.test.ts`; `packages/engine/test/property/aio.property.test.ts` |
| `US3`, `FR-007`, `FR-009`, `FR-010` | enveloppe, protocole async/sync, traces et provenance | `packages/engine/test/unit/aio.engine.unit.test.ts`; `packages/engine/test/integration/aio.integration.test.ts`; `packages/engine/test/unit/aio.boundary.unit.test.ts` |
| `FR-008` | frontière de périmètre | `packages/engine/test/unit/aio.scope.unit.test.ts` |
| comparaison informative | `L-*`, non normative | `packages/engine/test/unit/aio.legacy-comparison.unit.test.ts` |
| `G-001..G-007` | golden scientifique | **absent — T014/T021 attendent l'approbation humaine** |

Les anciens chemins indicatifs `packages/engine/src/aio/__tests__/*` ne sont pas utilisés. La convention réelle du dépôt sépare `packages/engine/test/unit`, `property`, `integration` et `golden`; les identifiants `G-*` restent volontairement non satisfaits.
