# Goal UI-AIO-001A-PAGE1 — Finaliser Site, Météo et Besoins avec Sol

## Objectif

Terminer la première tranche de `UI-AIO-001` avec Sol : restaurer fidèlement les surfaces validées Site/Météo et Besoins, enregistrer toutes les entrées dans `ProjectInputsV1`, normaliser les trois modes de besoins vers le contrat journalier 24 h du moteur AIO et exposer un bilan Page 1 calculé, traçable et invalidable.

La tranche suivante `UI-AIO-001B-PRESIZING` n'est lancée qu'après la convergence de ce goal.

## Autorités

1. `AGENTS.md`, la Constitution, `ROADMAP.md` et `PRODUCT.md`.
2. `specs/001-canonical-input-data/`, `specs/002-validated-ui-foundation/` et `specs/003-aio-core/` convergés.
3. `../design-proposition/app` à la révision validée comme autorité visuelle et interactive en lecture seule.
4. `../kyasoldesign/src/ksd_app` comme preuve historique en lecture seule, jamais comme dépendance ni vérité scientifique.
5. `specs/004-aio-ui-integration/` comme contrat de ce goal.

## Résultat obligatoire

- Site : localité, coordonnées, orientation, source météo, ressource mensuelle POA sourcée, mois critique déclaré et état périmé si l'orientation/source change.
- Besoins : liste d'appareils classiques/inductifs, profil horaire direct et facture/compteur avec un seul mode actif.
- Temps de fonctionnement : 24 fractions horaires par appareil, modification accessible, conservation de l'énergie et détection des démarrages par bloc.
- Calcul : `ProjectFileV1 → ProjectInputsV1 → CanonicalDailyLoadV1 → AioSizingRequestV1 → @ksd/engine` sans formule React.
- Bilan Page 1 : énergie AC journalière, puissance coïncidente et exigence de démarrage issues de l'enveloppe AIO, avec warnings/contraintes/provenance.
- Fidélité : même structure, densité, composants et comportement que le design validé; les seules différences servent la vérité des données.

## Interdictions

- Aucun `MockEngine`, résultat de fixture, fallback météo, ratio usuel ou valeur Python copié en production.
- Aucun calcul métier dans un composant React.
- Aucun `/30` implicite pour convertir une facture mensuelle; la période observée doit être explicite.
- Aucun profil facture inventé; il doit référencer un profil normalisé et sourcé.
- Aucun usage de LPSP, LOLP, SRI, LCOE, SVI, équipement, câble, protection ou document.
- Aucun import ou chemin runtime vers le dossier parent.

## Phases et gates

1. Converger spec, registre des formules, modèle et carte de fichiers.
2. Tests d'abord pour le modèle et la normalisation des trois modes.
3. Implémenter adaptateurs et état de calcul Page 1; `pnpm verify:phase`.
4. Restaurer Site/Météo et Besoins depuis le design; `pnpm verify:phase`.
5. Tester projet → moteur, erreurs, stale, FR/EN et accessibilité.
6. Valider visuellement dans le navigateur intégré en une passe desktop + contrainte, corriger une passe et confirmer.
7. `pnpm verify`, convergence, commit et push.

Trois cycles de réparation maximum par gate. Une ambiguïté scientifique, une modification du format public ou un changement du design validé exige une décision explicite au lieu d'une invention.

## Définition de fini

Un utilisateur peut créer ou rouvrir un projet, définir Site/Météo, saisir chacun des trois modes de besoins, modifier les horaires d'appareils, sauvegarder/recharger sans perte, obtenir le même hash pour les mêmes entrées et constater qu'une modification technique invalide puis recalcule le bilan Page 1. Tous les tests et gates sont verts, la validation navigateur est documentée et le commit est poussé.
