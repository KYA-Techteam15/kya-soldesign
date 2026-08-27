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

1. Choisir l’organisation ouvrés/week-end.
2. Affecter lundi–vendredi aux ouvrés et samedi–dimanche au week-end.
3. Saisir deux profils.
4. Déplacer un jour et vérifier la partition.

**Attendu**: sept jours exactement ; série annuelle résolue sans trou.

## Scénario D — Périodes × types de jour

1. Créer une période novembre–février et une période mars–octobre.
2. Vérifier les quatre combinaisons.
3. Copier un profil puis en modifier un autre.
4. Créer volontairement un trou et un chevauchement.

**Attendu**: passage d’année accepté ; trou/chevauchement bloqués ; aucun profil perdu.

## Scénario E — Golden YEn annuel

1. Utiliser le dataset approuvé avec `N`, énergies et facteurs locaux connus.
2. Vérifier chaque poids `W = N × Etotal`.
3. Comparer numérateur, dénominateur et agrégat à l’équation (9).
4. Réduire à une période et un type.
5. Tester une énergie totale nulle.

**Attendu**: tolérance `1e-12` ; réduction exacte au facteur local ; zéro total indisponible.

## Scénario F — Vues annuelle et journalière

1. Ouvrir la vue annuelle.
2. Choisir une date de chaque combinaison.
3. Refaire avec un profil unique.

**Attendu**: agrégation quotidienne lisible ; détail 24 heures fidèle ; météo
différente selon la date même lorsque la charge est répétée.

## Scénario G — Web sans proxy Vite implicite

1. Lancer le développement et tester la passerelle Vite.
2. Construire pour un environnement web avec passerelle configurée.
3. Servir le `dist` avec un serveur statique et vérifier les URLs émises.
4. Refaire sans configuration de passerelle.

**Attendu**: aucune requête production vers `/external/*` ; succès avec la
passerelle ; état `unconfigured` explicite sans elle.

## Scénario H — Météo durable

1. Rechercher une localité, télécharger et prévisualiser.
2. Fermer sans confirmer et vérifier l’absence d’écriture.
3. Refaire et confirmer.
4. Détruire/recréer les providers puis rouvrir le projet hors ligne.
5. Injecter une panne à chaque étape de la transaction.

**Attendu**: aucune écriture à la prévisualisation ; météo et projet restaurés
après confirmation ; aucune moitié de transaction visible.

## Scénario I — Pays et localités bilingues

1. Parcourir tous les pays en français puis en anglais.
2. Télécharger une localité avec les deux noms disponibles.
3. Passer hors ligne et changer de langue.
4. Tester une localité sans traduction secondaire.

**Attendu**: code stable, tri et libellé localisés, repli vers le nom original.

## Scénario J — Nettoyage visuel

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

