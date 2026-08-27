# Contract — Hypothèses économiques et estimation principale

## Commande de conversion du stockage

Entrée : devise, prix total en unité monétaire minimale et stockage nominal de référence en kWh strictement positif.

Sortie : coût spécifique entier en unité monétaire minimale/kWh, valeur non arrondie à titre de trace, règle d'arrondi et issues.

Invariants :

- aucune tension ni capacité Ah ;
- division impossible si prix ou stockage n'est pas strictement positif ;
- aucune mutation du projet avant confirmation du brouillon ;
- même valeur canonique pour saisie directe et conversion équivalente.

## Estimation d'une configuration

```text
pvMinor = installedPvKwc × pvSpecificCostMinorPerKw
storageMinor = installedNominalStorageKwh × storageSpecificCostMinorPerKwh
inverterMinor = installedInverterKw × inverterSpecificCostMinorPerKw
mainEquipmentMinor = pvMinor + storageMinor + inverterMinor
```

Chaque multiplication et total suit la politique d'arrondi monétaire versionnée. Une composante absente rend le total principal indisponible ; elle ne vaut pas zéro. La sortie déclare les inclusions et exclusions. Le total avec marges, s'il est affiché, est une sortie séparée.
