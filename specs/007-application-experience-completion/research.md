# Research — Finalisation de l’expérience applicative

## Sources inspectées

- implémentation active sous `apps/desktop/src/routes/*` ;
- `App.tsx`, `ProjectSessionProvider`, `CatalogProvider` et ports applicatifs ;
- stores `ui.ts` et `settings.ts` ;
- schémas projet et `parseProjectFile` ;
- `ReportA4.tsx` et `DossierDocuments.tsx` ;
- constitution et architecture de KYA-SolDesign Next ;
- site public `https://kya-energy.com`, consulté le 2026-08-27 comme référence
  d’identité, pas comme dépendance d’exécution.

## Décisions retenues

### R-001 — Conserver la pile active `routes/*`

**Decision**: cette feature modifie les routes montées par `App.tsx`.

**Rationale**: les écrans sous `features/*` ne sont pas la pile active. Les
modifier en parallèle créerait deux implémentations divergentes.

**Rejected**: migrer simultanément vers `features/*`; hors périmètre et contraire
à la discipline de convergence page par page.

### R-002 — Catégoriser sans fusionner toutes les autorités

**Decision**: l’interface continue d’être persistée par `ui.ts`; les réglages
métier passent en `ApplicationSettingsV2`. La route les présente ensemble.

**Rationale**: thème et langue sont des préférences d’affichage, tandis que les
valeurs par défaut changent la création de dossiers et exigent validation/migration.

**Rejected**: un unique store global contenant toasts, dialogues, réglages métier,
assets et licence.

### R-003 — Ne pas remettre la profondeur de décharge dans les réglages globaux

**Decision**: `batteryDod` reste dans le projet et les données matériel.

**Rationale**: c’est une propriété physique essentielle au dimensionnement et
elle dépend du choix de batterie et des hypothèses du projet.

**Rejected**: appliquer une profondeur globale à tous les nouveaux projets.

### R-004 — Corriger la saisie numérique par brouillons validés

**Decision**: stocker le texte saisi dans le composant/form model et valider via
un schéma central avant mise à jour du store.

**Rationale**: l’implémentation actuelle utilise `Number(event.target.value)` ;
`Number('')` produit zéro et empêche une édition naturelle et honnête.

**Rejected**: ajouter seulement `min`/`max` HTML, insuffisants comme frontière de
validation et non fiables pour une virgule locale.

### R-005 — Appliquer les défauts avec un service dédié

**Decision**: déplacer la longue affectation du provider vers un mapper/service
testable `createProjectWithDefaults`.

**Rationale**: le provider orchestre la session ; il ne doit pas connaître le
détail de chaque réglage ni du mapping projet.

**Rejected**: conserver les affectations dans `ProjectSessionProvider` ou les
dupliquer dans l’accueil et la page Projets.

### R-006 — Garder le logo documentaire hors localStorage

**Decision**: stocker le fichier validé dans IndexedDB et référencer son ID.

**Rationale**: localStorage est synchrone, limité et inadapté aux binaires. Le
logo doit être atomiquement remplaçable et séparé du logo applicatif.

**Rejected**: URL/chemin libre uniquement, base64 dans le JSON ou copie dans le
répertoire `public` à l’exécution.

### R-007 — Un accueil de produit, pas une landing page

**Decision**: reprendre de KYA-Energy le duo vert/orange, les grands espaces,
les repères géométriques, les chiffres de crédibilité et les notions
innovation/fiabilité/accessibilité. Utiliser les schémas techniques existants.

**Rationale**: le site public établit la marque, mais l’utilisateur du logiciel
vient accomplir une tâche. Le dernier projet, le parcours disponible et l’état
des données doivent dominer.

**Rejected**: photographie hero plein écran, carrousel, vidéo, statistiques
institutionnelles non maintenues ou copie de la navigation du site public.

### R-008 — Étendre `CatalogSummary` sans inventer de version

**Decision**: ajouter des métadonnées optionnelles ou un état `unknown`.

**Rationale**: le résumé actuel fournit compteurs et avertissements, mais pas
version/date. Une valeur absente doit rester inconnue.

**Rejected**: afficher la version de l’application comme version catalogue.

### R-009 — Import/export via format canonique et port de plateforme

**Decision**: valider avant mutation, gérer explicitement les conflits et laisser
la plateforme choisir le mécanisme fichier.

**Rationale**: le navigateur ne garantit pas un dossier d’export persistant ; un
futur hôte desktop le peut.

**Rejected**: stocker un chemin Windows dans les réglages web ou importer du JSON
directement dans le store sans parseur.

### R-010 — Une stratégie d’autosauvegarde unique

**Decision**: formaliser l’enregistrement actuel comme stratégie `immediate` et
permettre éventuellement un debounce contrôlé. Le statut du dernier succès et
les erreurs deviennent visibles.

**Rationale**: `BrowserProjects` persiste déjà chaque mutation. Ajouter une
minuterie indépendante créerait des courses et deux autorités.

**Rejected**: sauvegarde immédiate plus intervalle périodique concurrent.

### R-011 — Taux manuel complet, réseau conditionnel

**Decision**: livrer le taux manuel exact hors ligne. Le réseau exige une source
approuvée, documentée et injectable.

**Rationale**: aucune source officielle ni politique de fraîcheur n’est définie
dans le dépôt. La constitution interdit un état trompeur.

**Rejected**: choisir arbitrairement une API gratuite ou coder un taux fixe.

### R-012 — Licence contractuelle, jamais simulée

**Decision**: définir les états et le port, avec adaptateur `unconfigured`. Les
mutations nécessitent l’approbation d’une autorité de licence.

**Rationale**: le dépôt ne contient ni serveur, ni clé publique, ni format de
licence approuvé.

**Rejected**: statut actif local par défaut ou activation purement décorative.

### R-013 — Validation documentaire avant impression

**Decision**: produire un `DocumentReadiness` séparant blocages et avertissements.

**Rationale**: l’aperçu existe, mais l’utilisateur doit savoir si le dossier est
structurellement valide et quelles informations commerciales manquent.

**Rejected**: désactiver silencieusement Imprimer ou autoriser tout document sans
retour.

## Questions externes à résoudre avant les sous-phases réseau

1. Quelle source de taux est approuvée pour les paires concernées et selon quelle
   fréquence de fraîcheur ?
2. Quelle autorité émet la licence : serveur, fichier signé, clé matérielle ou
   autre protocole ?
3. Quelles éditions de licence existent et quelles capacités contrôlent-elles ?

Ces questions ne bloquent ni l’accueil, ni les réglages locaux, ni le catalogue,
ni les projets, ni les rapports.
