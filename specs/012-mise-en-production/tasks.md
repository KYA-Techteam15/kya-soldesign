# Tâches — spec 012

## Lot A — Interface
- [x] T001 Barre du haut : Catalogue et Réglages (FR-A1)
- [x] T002 Style unique des listes déroulantes (FR-A2)
- [x] T003 Identification : nom pleine largeur, date, chargé de projet par défaut (FR-A3)
- [x] T004 Panneau de génération à côté de l'aperçu, visuels propres au dossier (FR-A4)
- [x] T005 Fenêtre de composition en trois zones (FR-A5)
- [x] T006 Tests, captures, `pnpm verify:phase`

## Lot B — Schéma unifilaire
- [x] T010 Nature des protections dans la topologie ; parafoudres en dérivation (FR-B3)
- [x] T011 Rotation des symboles au rendu
- [x] T012 Placement paysage gauche → droite, stockage, terre en pied (FR-B1, FR-B5)
- [x] T013 Formats A4/A3 paysage (FR-B2)
- [x] T014 Couloirs d'étiquettes et test géométrique anti-chevauchement (FR-B4)
- [x] T015 Cartouche, décimales, libellés (FR-B6) ; options (FR-B7)
- [x] T016 Intégration écran et rapport, tests, captures

## Lot D — Licences
- [x] T020 Catalogue de fonctions, éditions, durées (FR-D1, FR-D3)
- [x] T021 API d'admin simulée, jetons signés (FR-D2)
- [x] T022 Service de licence : états, grâce, anti-recul, rafraîchissement (FR-D4, FR-D5)
- [x] T023 `useEntitlement`, verrous d'interface (`LockMark`), contrôles de service (mise à jour, émission, création de projet)
- [x] T024 Écrans : activation, badge, alertes, Réglages → Licence, lecture seule (FR-D4 → FR-D6)
- [x] T025 Tests (matrice édition × fonctions, expiration, horloge), E2E

## Lot C — Rapport
- [x] T030 Pagination A4 de l'aperçu, mesurée ; l'impression sort les mêmes feuilles (`@page` à marge nulle) (FR-C1)
- [x] T031 Mentions internes retirées (couples évalués, empreinte SHA-256), synthèse, sommaire paginé (FR-C2, FR-C3)
- [x] T032 Planche paysage réductible sous son titre, colonnes texte / nombres, pied « réf · vN · page x/y », filets orange verticaux retirés (FR-C4, FR-C5)
- [x] T033 Correctif : l'impression de l'onglet Documents sortait une page blanche depuis la refonte du lot A ; test E2E en média `print`

## Lot E — Distribution
- [x] T040 Mises à jour : canaux stable/beta (commandes hôte `check_update`/`install_update`), boîte « Nouvelle version » avec notes, vérification quotidienne, mode `passive` (FR-E1) — clés et flux beta : action du propriétaire (RELEASING.md)
- [x] T041 Installateur aux couleurs KYA (images générées), suppression des données au choix à la désinstallation (case native NSIS) (FR-E2)
- [x] T042 Menu natif Fichier / Aide (Ctrl+N, Ctrl+O, Ctrl+S, projets récents, journaux), « Copier les infos de diagnostic » (FR-E3)

## Lot F — Usage et avis
- [x] T050 Consentement (accueil, non bloquant ; Réglages), file bornée envoyée par lots à `SimulatedUsageApi`, identifiant d'installation anonyme (FR-F1, FR-F2)
- [x] T051 « Donner un avis » / « Signaler un problème » vers l'API (diagnostic joint au choix), réponses dans Réglages → Avis et assistance, signalement direct depuis l'écran de plantage (FR-F3)

## Fermeture
- [x] T060 CHANGELOG, README, ROADMAP `PROD-001`, version 1.2.0, `pnpm verify` (vert), installateur
- [ ] T062 **À reprendre** (décision du 2026-09-25) : année importée (8 760 h) — l'énergie journalière du prédimensionnement doit être l'énergie **annuelle ÷ 365**, et non celle du jour le plus chargé (`designDay()` dans `packages/engine/src/load-profile/direct.ts`, `normalizeDirectHourlyRows`). Même règle « par an » que y_En ; revoir la forme horaire et la pointe associées, et les tests `page1-aio.integration` qui attendent aujourd'hui le jour le plus chargé.
- [ ] T061 **Bloquant avant vente réelle** : brancher `HttpAdminApi` sur la plateforme, remplacer `LICENSE_PUBLIC_KEY` par la clé publique de la plateforme, retirer `SimulatedAdminApi`, `DEMO_SIGNING_KEY`, `DEMO_KEYS` et la licence de démonstration automatique (la clé privée de démonstration est publique : tant qu'elle signe, n'importe qui peut forger une licence)
