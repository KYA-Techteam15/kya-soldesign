# Convergence — UI-AIO-001A Page 1

**Statut** : convergé

## Preuves acquises

- AIO-001 est convergé et son golden humain est approuvé.
- Le design validé expose déjà Site/Météo, les trois modes Besoins et les tableaux attendus.
- Le domaine exporte les trois normalisateurs canoniques nécessaires.
- L'audit legacy initial est enregistré dans `research.md`.
- `ProjectInputsV1` porte fuseau, ressource POA, mois critique, horaires 24 h, période facture et profil sourcé sans fallback.
- Les trois façades pures produisent `CanonicalDailyLoadV1`; les propriétés prouvent conservation et linéarité.
- Le chemin actif est `ProjectFileV1 → projectToAioInput → AioSizingEngine`; aucun stack parallèle n'est utilisé.
- Le bilan visible (énergie, puissance coïncidente, démarrage) provient exclusivement de l'enveloppe AIO actuelle.
- Version, hash, traces et diagnostics sont consultables dans « Preuve du calcul ».
- Le navigateur intégré a validé 2 400 Wh/j et 100 W pour `2 × 100 W × 0,5 × 24 h`.
- Les vues 1440×1000 et 1024×768, la ressource incomplète, les trois modes et le focus du dialogue ont été contrôlés.
- Gates finaux : 87 tests unitaires, 12 propriétés, 5 qualité des données, 2 golden, 15 intégration, 119 couverture, 19 e2e, build production.

## Décisions

- La facture utilise les jours observés exacts et un profil normalisé sourcé; sa pointe transitoire reste bloquée.
- Une pointe directe supérieure à la moyenne est conservée comme avertissement, mais le surge reste bloqué tant qu'AIO v1 ne porte pas sa magnitude.
- Une ressource solaire incomplète ou dont l'orientation a changé n'alimente aucun calcul solaire.
- Les hypothèses de prédimensionnement et leur provenance appartiennent au goal suivant `UI-AIO-001B-PRESIZING`.

## Complément A2 — météo réelle et besoins finalisés

**Statut** : convergé

- Le catalogue accepté ne contient plus qu'une source météo adossée à un fichier : Bombouaka PVGIS 5.3 TMY, 8 760 pas, SHA-256 `05dffc44112ac96fecf01143abc63d2d32faf88df069fb15485229a999ebb3a6`.
- Le parseur strict, le port PVGIS, l'import JSON et la prévisualisation partagent les mêmes contrats; un import sans fuseau reste analysable en UTC mais ne produit pas `γ`.
- La POA est calculée avec la position NOAA et la transposition Klucher depuis GHI/DNI/DHI; la comparaison indépendante pvlib est documentée dans `research.md`.
- Le mois critique minimal reste une recommandation visible; le mois de dimensionnement n'est transmis à AIO qu'après confirmation explicite de l'utilisateur.
- Les écrans Site/Météo et Besoins conservent la composition validée et affichent mensuelles, journée moyenne, charge, pointe, POA et `γ` depuis les enveloppes courantes.
- Simulation Bombouaka : 6,15 kWh/m²/j à 15°/180°, mois recommandé août, puis 2 400 Wh/j, pointe 100 W et `γ = 0,500` pour une charge de 100 W active 24 h.
- Gates finaux : 92 tests unitaires, 14 propriétés, 7 qualité des données, 2 golden, 18 intégration, 131 sous couverture (95,13 % des lignes), 19 E2E, 14 visuels et build production.
- `pnpm verify`, `pnpm test:visual` et la simulation dans le navigateur intégré sont verts.
