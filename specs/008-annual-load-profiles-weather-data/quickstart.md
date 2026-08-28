# Quickstart Validation — Profils annuels, échanges de charges et météo durable

## Préconditions

```powershell
cd G:\Code\kya\kya-sol-design\kya\ksd\kya-sol-design\kya-sol-design-next
pnpm install
pnpm dev
```

Préparer un projet avec une météo horaire validée, un inventaire mixte et au
moins deux profils horaires nettement différents.

## Scénario A — Inventaire Excel

1. Exporter l’inventaire.
2. Vérifier une seule feuille et les colonnes contractuelles.
3. Réimporter sans modification.
4. Vider `h00..h23` sur une ligne avec `heures_usage = 4,5`.
5. Introduire ensuite des erreurs dans quantité, rendement, coefficient et heures.

**Attendu**: round-trip exact ; horaire par défaut annoncé ; toutes les cellules
incorrectes listées ; aucune mutation tant que le fichier est invalide.

## Scénario B — Profil à trois colonnes

1. Exporter le profil actif.
2. Confirmer qu’il contient seulement heure, moyenne et pointe.
3. Réimporter en anglais puis en français.
4. Tester heure dupliquée, heure absente et pointe inférieure à la moyenne.

**Attendu**: remplacement atomique du seul profil actif ; erreurs cellulaires précises.

## Scénario C — Ouvrés et week-end

1. Depuis la page, ouvrir « Configurer les profils… ».
2. Choisir l’organisation ouvrés/week-end dans le dialogue unique.
3. Affecter lundi–vendredi aux ouvrés et samedi–dimanche au week-end.
4. Saisir directement les valeurs 0 h–23 h des deux journées types.
5. Vérifier qu’aucune entrée équipement ou facture n’est disponible.
6. Déplacer un jour et vérifier la partition.
7. Annuler puis vérifier que le projet est inchangé ; refaire et appliquer.

**Attendu**: deux profils exactement ; sept jours couverts ; annulation sans
mutation ; commit unique ; série annuelle répétant le bon profil par date.

## Scénario D — Périodes seules et périodes × types de jour

1. Choisir périodes seules puis créer novembre–février et mars–octobre.
2. Vérifier deux combinaisons `all-days` et saisir deux journées types.
3. Passer à périodes × types de jour via l’aperçu de migration.
4. Vérifier les quatre combinaisons ouvrés/week-end.
5. Copier un profil, réutiliser un autre puis tester une modification partagée.
6. Créer volontairement un trou et un chevauchement.
7. Fermer avec `Escape`, refuser l’abandon, puis appliquer après correction.

**Attendu**: passage d’année accepté ; nombres de profils exacts ; trou/
chevauchement bloqués ; copie indépendante ; partage annoncé ; aucun profil perdu.

## Scénario E — Golden YEn annuel

1. Utiliser le dataset approuvé avec `N`, énergies et facteurs locaux connus.
2. Vérifier chaque poids `W = N × Etotal`.
3. Comparer numérateur, dénominateur et agrégat à l’équation (9).
4. Réduire à une période et un type.
5. Tester une énergie totale nulle.

**Attendu**: tolérance `1e-12` ; réduction exacte au facteur local ; zéro total indisponible.

## Scénario F — Plages et fréquences du graphe

1. Ouvrir la vue annuelle : confirmer année entière + fréquence automatique/jour.
2. Sélectionner une période, un mois, une semaine, une journée et une plage libre.
3. Pour chaque plage, tester auto, horaire, journalier, hebdomadaire et mensuel.
4. En année horaire, zoomer sur une pointe rare et vérifier qu’elle est conservée.
5. Choisir une date de chaque combinaison et vérifier les 24 heures.
6. Exporter une vue journalière puis mensuelle et recomposer l’énergie horaire.
7. Refaire avec un besoin simple puis avec un profil composé.

**Attendu**: calcul/YEn/hash inchangés par les contrôles ; agrégations exactes ;
année horaire navigable ; extrema conservés ; export fidèle ; détail 24 heures.

## Scénario G — Autorité simple/composée

1. Renseigner équipements, profil simple et facture puis mémoriser les valeurs.
2. Activer une composition ouvrés/week-end et appliquer.
3. Vérifier que les formulaires simples sont remplacés par une synthèse et ne
   modifient plus le calcul.
4. Revenir au besoin simple après confirmation.

**Attendu**: une seule autorité active ; aucune donnée simple perdue ; retour
exact aux valeurs précédentes ; aucun mélange entre facture et profils composés.

## Scénario H — Web sans proxy Vite implicite

1. Lancer le développement et tester la passerelle Vite.
2. Construire pour un environnement web avec passerelle configurée.
3. Servir le `dist` avec un serveur statique et vérifier les URLs émises.
4. Refaire sans configuration de passerelle.

**Attendu**: aucune requête production vers `/external/*` ; succès avec la
passerelle ; état `unconfigured` explicite sans elle.

## Scénario I — Météo durable

1. Rechercher une localité, télécharger et prévisualiser.
2. Fermer sans confirmer et vérifier l’absence d’écriture.
3. Refaire et confirmer.
4. Détruire/recréer les providers puis rouvrir le projet hors ligne.
5. Injecter une panne à chaque étape de la transaction.

**Attendu**: aucune écriture à la prévisualisation ; météo et projet restaurés
après confirmation ; aucune moitié de transaction visible.

## Scénario J — Pays et localités bilingues

1. Parcourir tous les pays en français puis en anglais.
2. Télécharger une localité avec les deux noms disponibles.
3. Passer hors ligne et changer de langue.
4. Tester une localité sans traduction secondaire.

**Attendu**: code stable, tri et libellé localisés, repli vers le nom original.

## Scénario K — Nettoyage visuel

1. Vérifier projet, facture et alertes dans les deux thèmes.
2. Naviguer au clavier et provoquer erreur, avertissement et succès.
3. Tester 1024×700 et 760 px.

**Attendu**: photo et encadré facture absents ; aucun filet gauche coloré ; focus
et gravité des états toujours compréhensibles sans dépendre de la couleur.

## Commandes de fermeture

```powershell
pnpm typecheck
pnpm test:unit
pnpm test:property
pnpm test:golden
pnpm test:integration
pnpm check:ui
pnpm verify:phase
pnpm verify
git diff --check
```
