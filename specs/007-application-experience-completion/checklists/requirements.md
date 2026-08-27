# Requirements Checklist: Finalisation de l’expérience applicative

**Purpose**: vérifier que la feature couvre tout le périmètre validé et respecte la constitution.  
**Created**: 2026-08-27  
**Feature**: [spec.md](../spec.md)

## Specification quality

- [x] CHK001 Chaque user story est testable indépendamment.
- [x] CHK002 Chaque exigence FR-001 à FR-060 est liée à au moins une tâche.
- [x] CHK003 Chaque success criterion possède une preuve mesurable prévue.
- [x] CHK004 Les limites entre existant, amélioration et nouveau contrat sont explicites.
- [x] CHK005 Les inconnues externes sont des gates et non des valeurs inventées.

## Architecture and persistence

- [x] CHK006 `ProjectFileV1` reste inchangé ou sa modification possède une approbation explicite.
- [x] CHK007 La migration V1→V2 est atomique, testée et récupérable.
- [x] CHK008 `batteryDodPercent` est ignoré et aucune DoD globale n’existe.
- [x] CHK009 Les brouillons invalides ne sont jamais persistés comme zéro.
- [x] CHK010 Un seul service applique les défauts à la création.
- [x] CHK011 Les projets existants restent inchangés après modification des réglages.
- [x] CHK012 Les assets ne sont pas stockés dans localStorage.
- [x] CHK013 Une seule stratégie d’autosauvegarde est active.
- [x] CHK014 Les imports sont validés entièrement avant la première mutation.

## Truthful states

- [x] CHK015 Le catalogue inconnu n’affiche pas de version inventée.
- [x] CHK016 Le taux distant indisponible ne devient pas un taux par défaut.
- [x] CHK017 La licence sans fournisseur affiche `unconfigured`.
- [x] CHK018 Les erreurs de persistance sont visibles et récupérables.
- [x] CHK019 La provenance est conservée dans les exports et statuts applicables.
- [x] CHK020 Aucun calcul scientifique ou financier nouveau n’est réalisé dans React.

## User journeys

- [x] CHK021 Création et reprise sont accessibles en deux actions maximum.
- [x] CHK022 Les architectures futures ne créent jamais de projet.
- [x] CHK023 La limite de récents configurée est respectée.
- [x] CHK024 Recherche, tri, duplication, import et export projets sont testés.
- [x] CHK025 Les trois onglets catalogue utilisent leurs grandeurs exactes.
- [x] CHK026 Un utilisateur peut retirer un filtre actif et récupérer d’un zéro résultat.
- [x] CHK027 Tous les documents utilisent l’identité et la devise autoritaires.
- [x] CHK028 Chaque impression passe par `DocumentReadiness`.
- [x] CHK029 Les avertissements et blocages documentaires sont distingués.

## Internationalization and accessibility

- [x] CHK030 Toutes les nouvelles chaînes sont présentes en français et anglais.
- [x] CHK031 Aucun texte métier du périmètre n’est codé directement dans les routes.
- [x] CHK032 Les actions ont nom accessible, focus visible et ordre clavier logique.
- [x] CHK033 Les détails de provenance sont disponibles sans hover.
- [x] CHK034 Les erreurs sont associées à leurs champs et annoncées.
- [x] CHK035 `prefers-reduced-motion` est respecté.

## Verification evidence

- [x] CHK036 Tests unitaires migration, defaults, transferts, filtres et readiness verts.
- [x] CHK037 Tests de propriétés migration, nombres, taux et filtres verts.
- [ ] CHK038 E2E accueil, projets, réglages, catalogue et rapports verts.
- [x] CHK039 `pnpm check:ui` vert ou écarts hors périmètre documentés et approuvés.
- [x] CHK040 `pnpm verify:phase` vert à chaque phase.
- [ ] CHK041 `pnpm verify` vert en fermeture.
- [x] CHK042 `git diff --check` ne retourne aucune erreur.

## External decision gates

- [x] CHK043 La source de taux distante est approuvée ou explicitement non configurée.
- [x] CHK044 Le protocole de licence est approuvé ou explicitement non configuré.
- [x] CHK045 Aucune opération réseau différée n’est décrite comme livrée.

## Notes

- Cocher uniquement avec un lien vers test, capture, diff ou décision.
- Un item externe peut rester non coché si la feature est fermée avec état
  `unconfigured`, mais la capacité en ligne correspondante ne peut pas être
  déclarée terminée.

## Evidence recorded

- `pnpm verify:phase`: vert — lint, typecheck, UI source contracts, unit (145),
  property (14) et data (7).
- `pnpm test:golden`, `pnpm test:integration` et `pnpm test:coverage`: verts —
  2, 19 et 185 tests, couverture 91,22 % instructions / 96,04 % lignes.
- APP-001 E2E ajouté dans `apps/desktop/e2e/application-experience.spec.ts` :
  réglages catégorisés, taux manuel localisé et accès Projets récents (2/2),
  complété par l’accessibilité ciblée (4/4).
- CHK038 reste ouvert : la suite navigateur complète conserve un test historique
  `truth-states.spec.ts` qui attend l’ancien bouton de prédimensionnement
  indisponible, alors que l’adaptateur canonique actuel expose déjà ce moteur.
- `pnpm verify` n’est pas lancé volontairement : il exécute `pnpm build`, ce qui
  créerait le `dist` explicitement exclu de cette demande.
