# Contract — Dimensionnement manuel et optimisation optionnelle

## Dimensionnement manuel

La commande reçoit les cibles de prédimensionnement et exactement trois snapshots confirmés. Elle retourne une enveloppe déterministe contenant configuration entière, compatibilité, estimation principale, issues, warnings, version, hash et trace.

Une incompatibilité retourne un résultat invalide expliqué, jamais une configuration partielle présentée comme retenue.

## Activation de l'optimisation

Une requête avec `enabled = false` est rejetée par le service d'optimisation sans parcourir le catalogue. L'interface doit obtenir une confirmation d'activation.

## Scope par famille

- `fixed`: une référence/version exacte ;
- `shortlist`: une liste non vide ;
- `free`: toutes les références éligibles respectant les filtres optionnels.

Une solution contenant une référence hors scope est invalide, même si elle est meilleure selon l'objectif.

## Contraintes obligatoires

Les cibles minimales, puissances continue et de démarrage, tension DC, MPPT, Voc froid, courants, puissance PV maximale, courant de charge et limites de parallélisation ne peuvent pas être désactivés par la configuration utilisateur.

## Métriques

Pour PV, stockage utile et onduleur :

```text
relativeOversize = (obtained - required) / required
```

Une valeur négative viole le minimum et élimine le candidat. Les limites utilisateur éliminent les candidats dont le surdimensionnement dépasse la valeur autorisée.

## Ordres

- `closest`: `(maxOversize, sumOversize, completeCost, componentCount, stableKey)` ;
- `lowest-main-equipment-cost`: `(completeCost, maxOversize, sumOversize, componentCount, stableKey)` ;
- `fewest-components`: `(componentCount, maxOversize, sumOversize, completeCost, stableKey)`.

Les valeurs sont comparées lexicographiquement. Un coût incomplet interdit l'objectif coût ; pour les autres objectifs il est placé après toute valeur complète et son absence est visible.

## Application

La recherche retourne une liste de candidats `proposed`. Une commande distincte, portant l'identifiant de run et le hash du candidat, applique un candidat après confirmation. Toute divergence de hash refuse l'application.
