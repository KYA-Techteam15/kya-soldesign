# Plan d'implémentation — Page 1

## Architecture

```text
SectionSite / SectionBesoins
        ↓ saisies validées
ProjectInputsV1
        ↓ adaptateur hors React
Page1 load normalizers + weather resolver
        ↓
AioSizingRequestV1
        ↓
AioSizingEngineV1
        ↓
CalculationCapabilityPort
        ↓ projection seulement
TruthRail / bilan Page 1
```

## Ordre

1. Étendre le modèle et écrire les migrations/création vide.
2. Tester puis implémenter les normalisateurs Page 1.
3. Tester puis implémenter l'adaptateur projet/AIO et le port de calcul.
4. Compléter le composant actif Site/Météo copié du design, sans logique prototype.
5. Compléter le composant actif Besoins, ses trois modes et le dialogue des horaires.
6. Brancher bilan, stale, warnings, contraintes et provenance.
7. Gates, tests navigateur, comparaison visuelle, commit et push.

## Constitution check

- moteur pur, sérialisable et déterministe;
- aucune formule React;
- aucune donnée parent au runtime;
- aucun fallback, mock ou résultat durci;
- unités à la frontière;
- chaque formule historique documentée avant portage;
- modification du format public interdite sans migration/approbation.
