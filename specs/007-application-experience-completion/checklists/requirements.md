# Requirements Checklist: Finalisation de l’expérience applicative

**Purpose**: vérifier que la feature couvre tout le périmètre validé et respecte la constitution.  
**Created**: 2026-08-27  
**Feature**: [spec.md](../spec.md)

## Specification quality

- [ ] CHK001 Chaque user story est testable indépendamment.
- [ ] CHK002 Chaque exigence FR-001 à FR-060 est liée à au moins une tâche.
- [ ] CHK003 Chaque success criterion possède une preuve mesurable prévue.
- [ ] CHK004 Les limites entre existant, amélioration et nouveau contrat sont explicites.
- [ ] CHK005 Les inconnues externes sont des gates et non des valeurs inventées.

## Architecture and persistence

- [ ] CHK006 `ProjectFileV1` reste inchangé ou sa modification possède une approbation explicite.
- [ ] CHK007 La migration V1→V2 est atomique, testée et récupérable.
- [ ] CHK008 `batteryDodPercent` est ignoré et aucune DoD globale n’existe.
- [ ] CHK009 Les brouillons invalides ne sont jamais persistés comme zéro.
- [ ] CHK010 Un seul service applique les défauts à la création.
- [ ] CHK011 Les projets existants restent inchangés après modification des réglages.
- [ ] CHK012 Les assets ne sont pas stockés dans localStorage.
- [ ] CHK013 Une seule stratégie d’autosauvegarde est active.
- [ ] CHK014 Les imports sont validés entièrement avant la première mutation.

## Truthful states

- [ ] CHK015 Le catalogue inconnu n’affiche pas de version inventée.
- [ ] CHK016 Le taux distant indisponible ne devient pas un taux par défaut.
- [ ] CHK017 La licence sans fournisseur affiche `unconfigured`.
- [ ] CHK018 Les erreurs de persistance sont visibles et récupérables.
- [ ] CHK019 La provenance est conservée dans les exports et statuts applicables.
- [ ] CHK020 Aucun calcul scientifique ou financier nouveau n’est réalisé dans React.

## User journeys

- [ ] CHK021 Création et reprise sont accessibles en deux actions maximum.
- [ ] CHK022 Les architectures futures ne créent jamais de projet.
- [ ] CHK023 La limite de récents configurée est respectée.
- [ ] CHK024 Recherche, tri, duplication, import et export projets sont testés.
- [ ] CHK025 Les trois onglets catalogue utilisent leurs grandeurs exactes.
- [ ] CHK026 Un utilisateur peut retirer un filtre actif et récupérer d’un zéro résultat.
- [ ] CHK027 Tous les documents utilisent l’identité et la devise autoritaires.
- [ ] CHK028 Chaque impression passe par `DocumentReadiness`.
- [ ] CHK029 Les avertissements et blocages documentaires sont distingués.

## Internationalization and accessibility

- [ ] CHK030 Toutes les nouvelles chaînes sont présentes en français et anglais.
- [ ] CHK031 Aucun texte métier du périmètre n’est codé directement dans les routes.
- [ ] CHK032 Les actions ont nom accessible, focus visible et ordre clavier logique.
- [ ] CHK033 Les détails de provenance sont disponibles sans hover.
- [ ] CHK034 Les erreurs sont associées à leurs champs et annoncées.
- [ ] CHK035 `prefers-reduced-motion` est respecté.

## Verification evidence

- [ ] CHK036 Tests unitaires migration, defaults, transferts, filtres et readiness verts.
- [ ] CHK037 Tests de propriétés migration, nombres, taux et filtres verts.
- [ ] CHK038 E2E accueil, projets, réglages, catalogue et rapports verts.
- [ ] CHK039 `pnpm check:ui` vert ou écarts hors périmètre documentés et approuvés.
- [ ] CHK040 `pnpm verify:phase` vert à chaque phase.
- [ ] CHK041 `pnpm verify` vert en fermeture.
- [ ] CHK042 `git diff --check` ne retourne aucune erreur.

## External decision gates

- [ ] CHK043 La source de taux distante est approuvée ou explicitement non configurée.
- [ ] CHK044 Le protocole de licence est approuvé ou explicitement non configuré.
- [ ] CHK045 Aucune opération réseau différée n’est décrite comme livrée.

## Notes

- Cocher uniquement avec un lien vers test, capture, diff ou décision.
- Un item externe peut rester non coché si la feature est fermée avec état
  `unconfigured`, mais la capacité en ligne correspondante ne peut pas être
  déclarée terminée.
