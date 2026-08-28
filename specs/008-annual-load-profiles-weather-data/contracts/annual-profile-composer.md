# Contract — Dialogue de profils annuels composés

## Autorité

Le dialogue est l’unique surface de création et modification de la branche
`composed`. La page principale ne modifie ni calendrier, ni affectation, ni
valeur horaire. Elle affiche une synthèse et ouvre le dialogue.

## Organisations

| Identifiant | Combinaisons attendues |
|---|---|
| `workweek-weekend` | une période annuelle × ouvrés/week-end = 2 profils |
| `periods` | chaque période × tous les jours = nombre de périodes profils |
| `periods-by-day-type` | chaque période × ouvrés/week-end = `2 × périodes` profils |

Les profils sont exclusivement directs : 24 puissances moyennes obligatoires et
24 pointes facultatives. Aucune entrée équipement, facture, durée d’usage,
rendement ou coefficient de démarrage n’est admise.

## Séquence du dialogue

1. **Organisation** — choisir l’une des trois organisations composées.
2. **Calendrier** — définir groupes de jours et/ou périodes avec couverture visible.
3. **Profils horaires** — sélectionner chaque combinaison et saisir/importer
   les valeurs 0 h–23 h ; copier ou réutiliser un profil est explicite.
4. **Vérification** — afficher combinaisons, couverture, erreurs, avertissements
   et conséquences de migration avant application.

Le dialogue peut présenter ces étapes dans un même grand panneau avec navigation
interne ; elles ne doivent pas être distribuées entre plusieurs pages ou modales.

## Brouillon et atomicité

```text
open(project revision)
  → deep-copy active composed branch into draft
  → edit draft only
  → validate all combinations
  → preview migration and normalized defaults
  → apply(expected revision) OR cancel
```

- `Cancel`, fermeture par croix ou `Escape` détruit le brouillon après
  confirmation si celui-ci est sale.
- `Apply` est désactivé tant qu’une erreur existe.
- `Apply` vérifie `expectedProjectUpdatedAtIso` puis effectue un seul commit.
- une erreur ou un conflit conserve le dialogue, le brouillon et les messages.
- aucun profil orphelin n’est supprimé sans choix explicite.

## Éditeur d’une combinaison

L’éditeur affiche au minimum :

| Heure | Puissance moyenne | Puissance de pointe |
|---|---:|---:|
| `00`…`23` | obligatoire, `>= 0` kW | facultative, vide ou `>= moyenne` kW |

Une pointe vide est prévisualisée comme égale à la moyenne et signalée par
`PEAK_DEFAULTED_TO_AVERAGE`. Les commandes autorisées sont : importer, exporter,
copier depuis, copier vers et réutiliser un profil existant.

Copier crée une nouvelle identité indépendante. Réutiliser conserve une identité
partagée et l’interface l’annonce avant toute modification affectant plusieurs
combinaisons.

## Validation

Les erreurs bloquantes nomment la combinaison et le champ :

- partition des jours invalide ;
- trou ou chevauchement de périodes ;
- combinaison sans affectation ;
- profil absent, différent de 24 heures ou valeur non finie/négative ;
- pointe inférieure à la moyenne ;
- conflit de révision du projet.

Les avertissements nomment les défauts appliqués, profils partagés et profils
qui deviendraient orphelins.

## Page principale

Lorsque `activeMode = composed`, les formulaires équipements, horaire simple et
facture ne sont ni affichés ni focusables. Ils sont remplacés par : organisation,
nombre de périodes/types/combinaisons, état de validation, action « Configurer
les profils… » et action explicite de retour au besoin simple.

La branche simple est conservée sans mutation et redevient active uniquement
après confirmation du retour.

## Accessibilité et langues

- focus initial sur le titre ou la première erreur ;
- piège de focus, retour au déclencheur et fermeture `Escape` conforme au brouillon ;
- navigation clavier entre combinaisons et 24 lignes ;
- erreurs reliées aux champs avec résumé accessible ;
- structure stable en français et en anglais, sans texte concaténé ambigu.

