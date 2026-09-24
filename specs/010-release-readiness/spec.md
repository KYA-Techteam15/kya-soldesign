# Feature Specification: Version livrable — correctifs de bout en bout et exécutable Tauri

**Feature Branch**: `010-release-readiness`
**Roadmap ID**: `REL-001` (englobe `DESK-001`)
**Created**: 2026-09-23
**Status**: Approuvée par le demandeur — « corriger de bout en bout » (2026-09-23)
**Input**: audit complet du dépôt (état, erreurs, prérequis Tauri) et évaluation UX/UI de bout en bout
réalisée en pilotant l'application dans Chromium. Objectif : une version finale, distribuée aux
clients sous forme d'exécutable Windows Tauri, depuis un dépôt autonome.

## Objectif

Rendre l'application **exacte, fiable, cohérente et distribuable** :

1. corriger les erreurs de calcul qui touchent la sécurité électrique et la fiabilité annoncée ;
2. supprimer les pertes de données, les plafonds de stockage et les gels d'interface ;
3. garantir que toutes les pages, et les documents remis au client, décrivent le même système à jour ;
4. terminer le bilinguisme, l'accessibilité et le vocabulaire destiné au client ;
5. empaqueter l'application avec Tauri, avec les prérequis standards d'un logiciel commercial ;
6. préparer l'extraction du dossier `kya-sol-design-next` dans son propre dépôt.

## Décisions validées

- Le demandeur approuve la correction de toutes les anomalies listées, y compris celles qui modifient
  des résultats de calcul (Voc à froid, simulation horaire, protections, câbles). Les baselines
  touchées sont régénérées avec une note d'audit (`research.md`, section « Baselines modifiées »),
  conformément à la constitution.
- `kya-sol-design-next` deviendra la racine d'un dépôt autonome : `.github/` reste dans ce dossier.
- Quatre décisions restent **à la charge du demandeur** et ne bloquent pas l'implémentation ; le
  code les rend configurables et affiche un état explicite tant qu'elles ne sont pas prises :
  fournisseur de licence, certificat de signature, hébergement des mises à jour, contrat
  commercial du géocodage (Open-Meteo ou autre).

## Constats de départ (preuves)

| Réf. | Constat | Preuve |
|---|---|---|
| C-01 | Voc à froid calculé avec le mauvais signe : 0,93·Voc au lieu de 1,07·Voc | `sizing/engine.ts` `coldVoc` ; coefficients catalogue négatifs ; tests en +0,003 |
| C-02 | Température froide fixée à 0 °C pour tous les sites | `projectToAio.ts` `coldTemperatureC: 0` |
| C-03 | Deux simulations horaires de physiques différentes (AC/DC, plafond onduleur, rendement en décharge) | `presizing/engine.ts`, `finance/engine.ts` |
| C-04 | Simulation démarrant batterie pleine | idem |
| C-05 | Courant batterie calculé à la tension nominale sans rendement ; série AC limitée à 63 A ; section thermique empirique ; mode de pose ignoré | `protection-cabling/engine.ts` |
| C-06 | Montants en flottants, traces de calcul vides | `finance/engine.ts`, enveloppes `trace: []` |
| C-07 | Hook appelé après un retour anticipé ; aucune frontière d'erreur | `WorkshopLayout.tsx` |
| C-08 | Stockage localStorage : plafond de 7 projets, perte silencieuse quand le quota est atteint, message navigateur brut | mesuré (724 Ko/projet, 8ᵉ duplication refusée) |
| C-09 | Historique d'annulation global à tous les projets ; annuler une suppression non persisté | `ProjectSessionProvider.tsx` |
| C-10 | Gel de l'interface : 3,2 s par modification de marge, 6,8 s à l'ouverture du Dossier | mesuré (longtask) |
| C-11 | Chiffrage et dossier calculés sur un dimensionnement périmé ou orphelin ; états « VALIDÉ » sur résultats périmés | parcours mesuré |
| C-12 | Prix unitaires figés au premier dimensionnement | Chiffrage garde le prix d'un module 250 W après passage à 340 W |
| C-13 | Liste des onduleurs (4S×4P) contredisant le résultat moteur (7S×2P) | formule dupliquée dans `SectionMateriel.tsx` |
| C-14 | Protections : lignes « VALIDÉ » sans choix, dossier « NON CONFIGURÉ », schéma en 14 A | captures |
| C-15 | Word exportable avec des trous ; dates absentes ; valeur interne « residential » ; pays incohérent ; lignes à 0 | Word et aperçu extraits |
| C-16 | ~150 textes français en dur, contrôle i18n aveugle, devise XOF/FCFA mêlée | balayage + mode EN |
| C-17 | Dialogues sans piège de focus, fermeture au clic extérieur, Échap ferme toute la pile, `window.confirm` | `Dialog.tsx`, `Catalog.tsx` |
| C-18 | Jargon de développement visible (barre d'état, « prototype de design », 1,8 s de splash) | captures |
| C-19 | Proxy Vite requis pour PVGIS / géocodage ; téléchargements `<a download>` ; aucun `src-tauri` | `vite.config.ts`, adapters |
| C-20 | `xlsx` 0.18.5 vulnérable ; bundle unique de 3,4 Mo ; 5,1 Mo de PNG | `package.json`, build |
| C-21 | Réglages « enregistrement automatique » et « destination d'export » sans effet | aucune lecture hors écran Réglages |
| C-22 | Tests en dépassement de délai ; accessibilité E2E en échec par lenteur | `pnpm test`, `pnpm test:e2e` |

## Scénarios utilisateur

### US1 — Un dimensionnement électriquement sûr et une fiabilité juste (P1)

L'ingénieur dimensionne un système : les chaînes PV respectent le Voc maximal de l'onduleur à la
température minimale du site, et le SRI affiché est le même partout pour un même système.

**Test indépendant** : tests unitaires et golden du moteur, puis parcours complet.

1. **Given** un module à coefficient Voc −0,28 %/°C et un site à 15 °C minimum, **When** le moteur
   dimensionne, **Then** le Voc à froid vaut Voc·(1 + 0,0028·10) et une chaîne qui dépasse le Voc max
   de l'onduleur est rejetée.
2. **Given** un coefficient catalogue de signe positif, **When** le moteur l'utilise, **Then** il est
   traité comme une baisse de Voc avec la température et un avertissement cite la fiche.
3. **Given** un système retenu, **When** on compare Hypothèses, Chiffrage, Dossier et rapport,
   **Then** la simulation horaire est la même fonction et les écarts ne viennent que des
   différences de système, qui sont nommées.

### US2 — Aucune donnée perdue, aucun plafond de projets (P1)

**Test indépendant** : E2E — créer 30 projets réels, recharger, retrouver les 30 ; saturer le
support et constater un message clair sans perte.

1. **Given** 30 projets avec météo horaire, **When** l'utilisateur recharge, **Then** les 30 sont là.
2. **Given** une écriture impossible, **When** l'utilisateur modifie un champ, **Then** un bandeau
   « Enregistrement impossible » s'affiche avec une action « Réessayer » et la modification reste
   en attente, jamais ignorée en silence.
3. **Given** une suppression confirmée, **When** l'utilisateur clique « Annuler » dans la
   notification, **Then** le projet est restauré et le reste après rechargement.
4. **Given** deux projets édités tour à tour, **When** l'utilisateur annule dans le projet A,
   **Then** seul A change.

### US3 — Des pages toujours synchronisées (P1)

1. **Given** un dimensionnement valide, **When** la charge change, **Then** Chiffrage, Dossier,
   documents et rail indiquent « périmé » et n'affichent pas les anciens montants comme actuels.
2. **Given** un module changé, **When** l'onduleur n'est pas encore choisi, **Then** le chiffrage
   n'utilise pas l'ancien système.
3. **Given** des prix unitaires non saisis, **When** le matériel change, **Then** les prix dérivés
   suivent le nouveau matériel ; un prix saisi à la main est conservé et signalé comme tel.
4. **Given** une liste d'onduleurs compatibles, **When** elle affiche une configuration, **Then**
   c'est celle du moteur.
5. **Given** un calibre choisi en Protections, **When** on ouvre le schéma, **Then** le schéma
   montre ce calibre, et l'état du tronçon est identique sur la page, le rail et le dossier.

### US4 — Des documents remis au client exacts et complets (P1)

1. **Given** un dossier incomplet ou périmé, **When** l'utilisateur exporte en Word ou imprime,
   **Then** l'action est bloquée avec la liste des points à régler.
2. **Given** un document généré, **Then** il porte la date d'émission, la date de fin de validité,
   le chargé de projet, des libellés traduits, un site cohérent et aucune ligne de coût à zéro.
3. **Given** une entreprise non configurée, **When** l'utilisateur ouvre l'accueil, **Then** il est
   invité à renseigner l'identité qui figurera sur les documents.

### US5 — Une interface fluide, bilingue et accessible (P2)

1. **Given** un projet complet, **When** l'utilisateur modifie une marge, **Then** aucune tâche ne
   bloque l'interface plus de 100 ms et les valeurs se mettent à jour sans passer par « — ».
2. **Given** la langue anglaise, **When** on parcourt les 8 étapes et les documents, **Then** aucun
   texte français ne subsiste (hors données saisies), et le contrôle i18n le prouve.
3. **Given** un dialogue ouvert, **Then** le focus y est placé et piégé, Échap ne ferme que le
   dialogue du dessus, et un clic extérieur ne détruit pas un brouillon.

### US6 — Un exécutable Windows professionnel (P1)

1. **Given** un poste Windows 10/11 sans internet, **When** l'installateur est lancé, **Then**
   l'application s'installe, démarre et fonctionne hors ligne (sauf téléchargements météo).
2. **Given** l'exe, **When** l'utilisateur télécharge une météo PVGIS ou recherche une ville,
   **Then** l'appel réussit sans serveur de développement.
3. **Given** l'exe, **When** l'utilisateur exporte un Word, un SVG, un projet ou les réglages,
   **Then** une boîte « Enregistrer sous » native s'ouvre.
4. **Given** un plantage de rendu, **Then** un écran de récupération s'affiche, l'erreur est
   journalisée et l'utilisateur peut signaler le problème.
5. **Given** une nouvelle version publiée (quand l'hébergement est décidé), **Then** l'application
   la propose et l'installe.

## Exigences fonctionnelles

### A. Calculs (moteur pur)
- **FR-001** Voc à froid : `Voc_froid = Voc_STC · (1 + β · (T_froid − 25 °C))`, β signé (négatif). Un β
  positif est traité comme `−|β|` avec l'avertissement `VOC_COEFFICIENT_SIGN_CORRECTED`. Défaut sans
  fiche : β = −0,0030 /°C avec l'avertissement `VOC_COEFFICIENT_DEFAULTED`.
- **FR-002** Température froide de conception : champ projet `designColdTemperatureC`, pré-rempli par la
  température ambiante minimale de la série météo (T2m PVGIS) et modifiable. Sans valeur, le
  dimensionnement est bloqué avec `COLD_TEMPERATURE_MISSING`. La température maximale ambiante est
  conservée pour les câbles.
- **FR-003** Une seule fonction de bilan horaire `simulateHourlyEnergyBalance` sert au
  prédimensionnement et à la finance : PV côté DC, charge AC, rendement onduleur appliqué à la
  production directe **et** à la décharge, plafond de puissance onduleur sur la somme directe +
  décharge, surplus DC stocké avec le rendement batterie.
- **FR-004** État de charge initial : la simulation parcourt l'année une première fois pour
  stabiliser l'état de charge, puis mesure la seconde année (état initial = état de fin d'année).
- **FR-005** Protections : courant batterie `1,25 · P_onduleur / (η_onduleur · V_min)`, avec
  `V_min = 0,875 · V_nominale` (seuil de coupure 1,75 V/élément plomb, 2,8 V/élément LFP).
  Séries normalisées étendues : disjoncteurs AC 6–125 A (IEC 60898) puis 160–630 A (IEC 60947-2),
  fusibles gG jusqu'à 630 A. Aucun calibre non normalisé n'est proposé ; au-delà : `RATING_OUT_OF_RANGE`.
- **FR-006** Câbles : section thermique par tableaux de courant admissible IEC 60364-5-52 (méthode C
  « non enterré », méthode D1 « enterré », PVC 70 °C, deux conducteurs chargés, cuivre/aluminium),
  facteur de correction de température (air : Tmax site ; sol : 20 °C de référence, affiché comme
  hypothèse). Le mode de pose change le résultat.
- **FR-007** Montants en unités mineures entières, arrondis à chaque ligne, TVA et remise arrondies.
- **FR-008** Chaque enveloppe publique porte une trace non vide (formule, source, version).
- **FR-009** Constante « arbres équivalents » sourcée (22 kg CO₂/arbre/an, AEE) et nommée.
- **FR-010** `compatibleInverters` et `SizingEngine` choisissent la même configuration PV.

### B. Persistance et état
- **FR-011** Projets stockés un par un dans un dépôt asynchrone : IndexedDB en navigateur, SQLite
  sous Tauri. Plus de plafond lié à localStorage ; migration automatique des projets existants.
- **FR-012** File d'écriture avec état visible (« Enregistré », « Enregistrement… », « Échec — Réessayer »),
  délai configurable (réglage « enregistrement automatique » réellement appliqué).
- **FR-013** Historique d'annulation par projet, borné, avec regroupement des frappes successives d'un
  même champ ; Ctrl+Z / Ctrl+Y hors champ de saisie ; suppression annulable par la notification.
- **FR-014** Frontière d'erreur globale avec écran de récupération, journalisation et signalement.
- **FR-015** Plus aucun hook conditionnel (règle lint activée).

### C. Synchronisation
- **FR-016** Un résultat dépendant d'un calcul périmé est lui-même périmé : la finance exige un
  dimensionnement dont le hash correspond aux entrées et à la sélection courantes.
- **FR-017** Les états d'étape (rail, dossier) tiennent compte de la péremption et de la cohérence
  Protections ↔ dossier.
- **FR-018** Prix unitaires : 0 = « automatique » dérivé du matériel courant ; valeur saisie = prix
  manuel, conservé et signalé ; aucune écriture automatique dans le projet.
- **FR-019** L'interface n'implémente aucune formule de dimensionnement ; la liste des onduleurs vient
  du moteur.
- **FR-020** Le schéma utilise les types et calibres choisis ; sans choix, il affiche « à choisir ».
- **FR-021** Les états de calcul conservent la dernière valeur pendant un recalcul (pas de retour à « — »).

### D. Documents
- **FR-022** Contrôle de complétude commun à l'impression et au Word, recalculé à chaque changement.
- **FR-023** Date d'émission, date de fin de validité, chargé de projet, libellés traduits, site
  cohérent, lignes à 0 masquées, montants sans décimales, devise unique.
- **FR-024** Invitation à configurer l'identité de l'entreprise tant qu'elle est vide.
- **FR-025** Noms de fichiers exportés conservant les lettres accentuées translittérées.

### E. Interface, langue, accessibilité
- **FR-026** Tous les textes de l'interface passent par l'i18n ; le contrôle détecte le texte JSX et
  les attributs `title`, `placeholder`, `aria-label`, `alt` en dur ; les clés inutilisées sont retirées.
- **FR-027** Une seule présentation de la devise, dérivée du code ISO du projet.
- **FR-028** Dialogues : focus initial, piège de focus, pile Échap, pas de fermeture destructive au clic
  extérieur ; plus de `window.confirm`.
- **FR-029** Démarrage sans délai artificiel ; pas de mention « prototype » ; barre d'état orientée
  utilisateur (enregistrement, connexion, version).
- **FR-030** Libellés accessibles sur les boutons à icône ; palette ouverte par une commande, pas par un
  faux événement clavier.
- **FR-031** En-têtes de tableaux non tronqués ; nom de projet en police de texte ; architectures à
  venir regroupées sous une section compacte.
- **FR-032** Composants illisibles (lignes JSX de milliers de caractères) découpés ; CSS morte supprimée.

### F. Performance
- **FR-033** Aucune modification ordinaire ne bloque le thread principal plus de 100 ms ; les calculs
  lourds sont mis en cache par empreinte et les exécutions de balayage passent par un Web Worker.
- **FR-034** Découpage du code par écran ; images converties en WebP.

### G. Bureau (Tauri)
- **FR-035** Application Tauri 2 : identifiant `com.kya-energy.soldesign`, nom « KYA-SolDesign »,
  installateur NSIS (fr/en), WebView2 embarqué hors ligne, instance unique, mémoire de fenêtre.
- **FR-036** Réseau via `tauri-plugin-http` limité à PVGIS, Open-Meteo et BigDataCloud ; clé
  commerciale Open-Meteo configurable.
- **FR-037** Fichiers via boîtes natives (`dialog`, `fs`) ; destination d'export mémorisée selon le réglage.
- **FR-038** SQLite comme dépôt de projets, sauvegarde automatique au démarrage (5 rotations),
  sauvegarde et restauration manuelles de tous les projets.
- **FR-039** Journal fichier (`tauri-plugin-log`), dossier des journaux accessible, erreurs frontales
  transmises au journal.
- **FR-040** Mises à jour (`tauri-plugin-updater`) activées par configuration de publication ; sans
  configuration, l'état « non configuré » est affiché.
- **FR-041** CSP stricte, permissions minimales, outils de développement absents en production.
- **FR-042** Association du format `.ksd` (ouvrir un projet exporté par double clic).

### H. Prérequis logiciels et dépôt
- **FR-043** À propos : version réelle, canal, date de build, journal des modifications, mentions
  tierces, contrat de licence, confidentialité, aide, support.
- **FR-044** `THIRD_PARTY_NOTICES` généré ; `LICENSE` propriétaire ; `CHANGELOG.md`.
- **FR-045** `xlsx` remplacé par la version corrigée officielle (SheetJS 0.20.3).
- **FR-046** CI : qualité sur Linux, construction et publication Windows (`tauri-action`) avec
  signature et mises à jour activées par secrets.
- **FR-047** Dépôt autonome : artefacts de travail retirés (`.tmp`, `work/`, captures isolées),
  `.gitignore` complet, README d'installation et de publication.
- **FR-048** Délais de test réalistes et suites vertes (`pnpm verify`).

## Hors périmètre

- Nouvelles topologies (régulateur séparé, réseau, hybride, pompage, éclairage).
- Choix commerciaux (fournisseur de licence, certificat, hébergeur, contrat géocodage) : branchés
  mais non décidés ici.
- Rédaction juridique définitive de l'EULA et de la politique de confidentialité (brouillons fournis).

## Critères de succès

- **SC-001** Aucun cas golden ne valide une chaîne dont le Voc à froid dépasse le Voc max onduleur.
- **SC-002** Même système ⇒ même SRI dans Hypothèses (si identique), Chiffrage, Dossier, Word.
- **SC-003** 30 projets réels persistés et relus ; zéro perte silencieuse en quota saturé.
- **SC-004** Tâche longue maximale < 100 ms lors d'une modification de marge ou de besoin.
- **SC-005** Balayage i18n : 0 texte en dur ; parcours EN sans français.
- **SC-006** `pnpm verify` vert ; `pnpm tauri build` produit un installateur NSIS fonctionnel.
