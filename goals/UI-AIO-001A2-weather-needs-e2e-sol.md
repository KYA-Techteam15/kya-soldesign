# Goal Sol — UI-AIO-001A2 Page 1 finie

## Objectif

Finaliser la Page 1 AIO de bout en bout avant le prédimensionnement : reproduire strictement les écrans Site/Météo et Besoins de la dernière `design-proposition` validée, remplacer tout prototype par des données PVGIS réelles adossées à un fichier JSON, produire les graphes et calculs depuis le moteur TypeScript pur, puis prouver le parcours complet par simulation navigateur.

## Autorités

- Design : `../design-proposition/app`, commit validé `1be343f`.
- Comportement historique à auditer : `../kyasoldesign/src/ksd_app`.
- Calcul et données de production : contrats et moteurs de ce dépôt uniquement.
- Source météo embarquée initiale : réponse officielle PVGIS 5.3 JSON pour Bombouaka, conservée dans `packages/catalog/data/weather/` avec SHA-256.

## Résultat obligatoire

1. Le catalogue ne présente aucune source météo sans fichier contrôlé et importable.
2. Bombouaka dispose d'une TMY PVGIS-SARAH3 réelle de 8 760 pas, jamais d'une série simulée.
3. Le dialogue validé permet ville/coordonnées, téléchargement PVGIS versionné, import JSON local, prévisualisation puis enregistrement explicite.
4. Le moteur parse GHI/DNI/DHI/température, calcule le soleil et la POA Klucher selon inclinaison/azimut, les 12 moyennes journalières, les 24 profils moyens et l'orientation recommandée.
5. Une modification d'orientation recalcule depuis la TMY; elle ne réétiquette jamais d'anciennes mensuelles.
6. Besoins conserve les trois méthodes validées, leurs brouillons, les horaires modifiables, les graphes moyen/pointe/irradiance, le bilan AIO et le facteur de qualité `γ` calculé.
7. Les résultats publics portent version, hash, provenance, traces, warnings et raisons d'indisponibilité.
8. Les tests unitaires, propriétés, données, golden, intégration et E2E passent; le parcours est simulé visuellement en desktop et fenêtre contrainte.

## Interdictions

- aucune météo, courbe, mensuelle, température ou résultat aléatoire/simulé;
- aucun enregistrement météo sans fichier ou réponse JSON conservée et hashée;
- aucune formule dans React;
- aucune dépendance d'exécution vers le parent Python;
- aucun fallback de fuseau, rendement, simultanéité, profil, mois critique ou orientation;
- aucune mise à jour opportuniste des golden.

## Définition de fini

La Page 1 est finie seulement si un projet Bombouaka peut charger sa TMY réelle, afficher les mensuelles et la journée moyenne, modifier l'orientation et obtenir un nouveau calcul, définir les besoins dans chacun des trois modes, modifier les heures, afficher les graphes et le bilan/`γ`, puis reproduire ces résultats après navigation sans erreur ni donnée fabriquée.
