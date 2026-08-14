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
