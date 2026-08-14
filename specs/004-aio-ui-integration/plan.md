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

1. Figer le JSON PVGIS réel, le manifeste et les tests de qualité; supprimer les sources sans fichier.
2. Tester puis implémenter parseur TMY, position solaire, POA Klucher et agrégations.
3. Étendre le modèle autoportant et tester `γ` dans l'enveloppe Page 1.
4. Raccorder téléchargement/import au port app, sans réseau dans le moteur.
5. Restaurer Site/Météo depuis le design validé avec graphes réels et états durcis.
6. Finaliser Besoins, ses trois modes, le dialogue des horaires et le graphe charge/soleil.
7. Brancher bilan, stale, warnings, contraintes, provenance et sauvegarde en mémoire.
8. Gates, simulation navigateur, comparaison visuelle bornée, convergence, commit et push.

## Constitution check

- moteur pur, sérialisable et déterministe;
- aucune formule React;
- aucune donnée parent au runtime;
- aucun fallback, mock ou résultat durci;
- unités à la frontière;
- chaque formule historique documentée avant portage;
- modification du format public interdite sans migration/approbation.
