# Contrat — Adaptateur projet vers AIO

## Chaîne

`ProjectFileV1 → parseProjectInputsV1 → resolve site/weather/load → AioSizingRequestV1 → AioSizingEngineV1`.

L'adaptateur vit dans `apps/desktop/src/app/adapters/` et n'est jamais appelé directement par React. Il dépend des ports projet/catalogue/calcul et des fonctions pures exportées par les packages.

## Sortie

```ts
type ProjectToAioResult =
  | { status: 'ready'; request: AioCalculationRequestV1 }
  | { status: 'blocked'; issues: readonly ProjectAioIssue[] };
```

Chaque issue contient un code stable, un chemin de formulaire, les sorties AIO affectées et une clé de traduction.

## Règles

- les champs administratifs ne modifient pas le hash;
- localité, orientation, ressource solaire, mode de charge actif et provenance y participent;
- une ressource météo périmée n'est pas transmise;
- le mois et sa valeur POA correspondante composent `solarDesignResource`;
- aucune provenance n'est forgée à partir d'un simple label UI;
- les hypothèses AIO restent optionnelles dans cette tranche; leurs sorties dépendantes seront bloquées jusqu'à `UI-AIO-001B`;
- les réponses de calcul portent l'ID projet et le hash attendus avant publication.
