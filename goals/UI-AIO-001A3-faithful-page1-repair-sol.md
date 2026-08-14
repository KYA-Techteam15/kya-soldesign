# Goal UI-AIO-001A3 — Reprise fidèle Page 1 par Sol

## Objectif

Corriger la Page 1 sans redesign : recopier la composition et les interactions de la dernière `design-proposition` validée, puis raccorder cette interface aux contrats et moteurs TypeScript existants. La page n'est terminée que lorsque Site/Météo, Besoins et la bordure droite fonctionnent ensemble avec des données réelles.

## Autorités

1. Interface et interactions : `../design-proposition/app` au commit validé `1be343f814abc6379517389c42e484806634e6bb`.
2. Comportement historique des charges : `../kyasoldesign/src/ksd_app`, en lecture seule et avec correction documentée des heures décimales.
3. Calculs de production : `packages/domain`, `packages/engine` et les adaptateurs de ce dépôt.

## Résultat obligatoire

- Le dialogue météo conserve exactement les voies « Par pays et ville », « Par coordonnées » et « Depuis un fichier »; le nom et le GPS convergent vers le même téléchargement PVGIS réel et la même validation des 8 760 heures.
- Ajouter une charge classique crée `Nouvel appareil`, quantité `1`, puissance `100 W`, rendement `0,90`, durée `4 h` et un horaire valide centré à partir de 08 h.
- Ajouter une charge inductive crée `Nouveau moteur`, quantité `1`, puissance `500 W`, rendement `0,85`, coefficient de démarrage `3`, durée `2 h` et un horaire valide centré à partir de 08 h.
- La colonne `Heures` reste un champ numérique direct, comme dans le design validé.
- Le bouton global `Ajuster les heures…` ouvre un dialogue parcourant toutes les charges. Il déplace les positions sans modifier la durée saisie et conserve exactement sa somme; une durée décimale utilise au plus une fraction horaire.
- Les puissances, énergies, démarrages et séries horaires viennent exclusivement du moteur pur.
- Sur l'étape Besoins, la bordure droite reste ouverte et affiche le graphe validé : charge, dépassement de démarrage et irradiance, puis énergie, puissance, pointe et `γ`. Le bloc `Viabilité · SVI` conserve sa place mais n'invente aucune valeur avant la feature qui le calcule.

## Validation

Tests unitaires des durées entières/décimales et des blocs circulaires, tests de composant des valeurs par défaut et du dialogue global, E2E météo par nom/GPS et Besoins, `pnpm verify:phase`, `pnpm verify`, puis comparaison navigateur à 1440×1000 et 1024×768 contre la référence validée.
