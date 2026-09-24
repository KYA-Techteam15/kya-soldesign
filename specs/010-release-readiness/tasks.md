# Tasks: Version livrable — correctifs de bout en bout et exécutable Tauri

**Input**: `spec.md`, `plan.md`, `research.md`
**Gate**: `pnpm verify:phase` après chaque phase ; `pnpm verify` en fermeture

## Phase 1 — Exactitude du moteur (US1)

- [x] T001 Corriger `coldVoc` (signe, β positif corrigé, défaut −0,003) + tests réels à β négatif (FR-001)
- [x] T002 Ajouter `designColdTemperatureC` / températures ambiantes min-max au projet, extraction T2m à l'import météo, blocage `COLD_TEMPERATURE_MISSING` (FR-002)
- [x] T003 Créer `simulateHourlyEnergyBalance` avec mise en régime ; brancher prédimensionnement et finance ; tests d'invariants (FR-003, FR-004)
- [x] T004 Protections : V_min, rendement, séries IEC étendues, plus de calibre non normalisé (FR-005)
- [x] T005 Câbles : tableaux IEC 60364-5-52, facteurs de température, mode de pose effectif (FR-006)
- [x] T006 Finance en unités mineures entières ; traces non vides ; constante arbres sourcée (FR-007–FR-009)
- [x] T007 Aligner `compatibleInverters` sur `SizingEngine` (FR-010)
- [x] T008 Consigner les baselines modifiées ; `pnpm verify:phase`

## Phase 2 — Persistance et robustesse (US2)

- [x] T009 `ProjectStore` (IndexedDB, mémoire pour tests) + file d'écriture + migration localStorage (FR-011, FR-012)
- [x] T010 Réécrire la session projet : cache synchrone, écriture par projet, état d'enregistrement visible (FR-012)
- [x] T011 Historique d'annulation par projet avec regroupement ; raccourcis hors champ ; suppression annulable (FR-013)
- [x] T012 ErrorBoundary + gestionnaires globaux + journal (FR-014)
- [x] T013 Corriger le hook conditionnel ; activer la règle lint (FR-015)
- [x] T014 Appliquer le réglage d'enregistrement automatique ; `pnpm verify:phase`

## Phase 3 — Synchronisation et performance (US3, US5)

- [x] T015 Service de calcul stable (plus recréé à chaque frappe) + cache par empreinte des entrées lourdes (FR-033)
- [x] T016 États de calcul conservant la dernière valeur (FR-021)
- [x] T017 Finance bloquée sur dimensionnement périmé/orphelin ; états d'étape tenant compte de la péremption (FR-016, FR-017)
- [x] T018 Prix unitaires automatiques/manuels sans écriture implicite (FR-018)
- [x] T019 Liste d'onduleurs issue du moteur (FR-019)
- [x] T020 Protections : état cohérent page/rail/dossier ; schéma sur calibres choisis (FR-017, FR-020)
- [x] T021 Worker pour les balayages ; mesure longtask < 100 ms ; `pnpm verify:phase` (FR-033)

## Phase 4 — Documents (US4)

- [x] T022 Contrôle de complétude réactif, commun Word/impression (FR-022)
- [x] T023 Dates, chargé de projet, libellés, site, lignes à 0, arrondis, devise (FR-023, FR-027)
- [x] T024 Invitation identité entreprise ; noms de fichiers translittérés (FR-024, FR-025)

## Phase 5 — Langue, accessibilité, interface (US5)

- [x] T025 Contrôle i18n renforcé (JSX + attributs) (FR-026)
- [x] T026 Extraire tous les textes en dur (FR/EN) ; supprimer les clés mortes (FR-026)
- [x] T027 Dialogues accessibles et pile Échap ; remplacer `window.confirm` (FR-028)
- [x] T028 Splash, barre d'état, accueil, libellés d'icônes, palette (FR-029–FR-031)
- [x] T029 Découper les composants illisibles ; CSS morte ; en-têtes de tableaux (FR-031, FR-032)
- [x] T030 Découpage du code et images WebP ; `pnpm verify:phase` (FR-034)

## Phase 6 — Hôte Tauri et prérequis (US6)

- [x] T031 `src-tauri` : configuration, icônes, NSIS, WebView2 hors ligne, instance unique, fenêtre (FR-035)
- [x] T032 Couche `platform` : fetch HTTP, fichiers natifs, SQLite, journal (FR-036–FR-039)
- [x] T033 Sauvegarde automatique et manuelle ; association `.ksd` (FR-038, FR-042)
- [x] T034 Mises à jour activées par configuration de publication (FR-040)
- [x] T035 CSP, capacités minimales (FR-041)
- [x] T036 À propos, mentions tierces, licence, confidentialité, aide, signalement (FR-043, FR-044)
- [x] T037 SheetJS 0.20.3 (FR-045)
- [x] T038 `pnpm tauri build` : installateur produit et démarré

## Phase 7 — Dépôt autonome et fermeture

- [x] T039 Workflows qualité + publication Windows (FR-046)
- [x] T040 Nettoyage des artefacts, `.gitignore`, README, CHANGELOG, LICENSE (FR-047)
- [x] T041 Délais de test réalistes ; `pnpm verify` vert (FR-048)
- [x] T042 Parcours E2E complet (création → Word) FR et EN ; mise à jour ROADMAP
