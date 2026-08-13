# Goal UI-BASE-001-RECOVERY — Port fidèle du design validé

## Objectif

Rouvrir et reconstruire `UI-BASE-001` comme un port autonome fidèle de
`../design-proposition/app` à la révision validée
`1be343f814abc6379517389c42e484806634e6bb`. La source est une autorité visuelle
et interactive en lecture seule, jamais une dépendance runtime.

## Contrat d'exécution

1. Conserver les packages, contrats, adaptateurs, données canoniques, états de
   capacité véridiques, tests scientifiques et frontières autonomes déjà valides.
2. Copier puis adapter les composants, styles, structures et interactions du
   design validé. Ne pas réinterpréter, simplifier ou redessiner les surfaces.
3. Exclure `MockEngine`, `SizingEngine`, les fixtures, les stores persistants du
   prototype et toute valeur de calcul simulée.
4. Remplacer les résultats non disponibles par des états explicites sans modifier
   la géométrie et la hiérarchie au-delà des différences déjà approuvées.
5. Conserver le français et l'anglais, l'accessibilité clavier, les dialogues,
   les erreurs, les états vides et le comportement 1024 × 768 / texte 200 %.
6. Valider les surfaces Accueil, Projets, Catalogue, Réglages, les huit étapes de
   l'atelier, la palette, les dialogues et le dossier dans le navigateur intégré.
7. Comparer source et cible à 1440 × 1000 et 1024 × 768. Les captures générées
   depuis la cible ne constituent jamais seules une preuve de fidélité.
8. Documenter chaque différence visible restante avec sa cause et son autorité.
   Une différence non approuvée empêche la fermeture de la feature.
9. Exécuter `pnpm verify:phase` après les phases de portage, puis `pnpm verify`,
   `pnpm test:visual` et la convergence documentaire avant clôture.
10. Ne commencer aucune formule AIO et ne créer aucun objectif d'implémentation
    AIO pendant ce goal.

## Conditions de clôture

- La source et la cible ont une correspondance composant par composant traçable.
- Les parcours principaux fonctionnent dans le navigateur intégré.
- Les comparaisons visuelles source/cible ont été inspectées de bout en bout.
- Les gates techniques et visuels sont verts.
- `convergence.md` rapporte les preuves réelles et les écarts encore ouverts.
- La suite proposée à Terra est un objectif séparé, sans l'exécuter.

