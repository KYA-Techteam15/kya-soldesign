# Contract — Protections et câbles

## Ordre obligatoire par tronçon

```text
configuration d'équipements valide
  → calcul de l'exigence
  → affichage des types admissibles
  → choix explicite du type par l'utilisateur
  → filtrage des calibres normalisés
  → choix explicite du calibre
  → calcul du câble
```

Aucune étape ne choisit implicitement le type au nom de l'utilisateur. Même lorsqu'un seul type est admissible, l'utilisateur doit le confirmer.

## Types admissibles

| Tronçon | Types proposés |
|---|---|
| PV–onduleur | fusible gPV, disjoncteur DC |
| Onduleur–batterie | fusible gG, disjoncteur DC |
| Onduleur–charges | disjoncteur AC |

## Plage et séries

Le calcul retourne courant minimal, courant maximal éventuel et tension de service. Le filtrage d'une série normalisée vérifie `calibre >= minimum` et, lorsqu'une borne maximale existe, `calibre <= maximum`. Il retourne toute la liste triée, pas seulement le premier calibre.

Si la liste est vide, le choix reste `unavailable`. Une valeur calculée hors série peut être affichée comme exigence mais jamais confirmée comme calibre normalisé.

## Choix et invalidation

Le choix confirmé contient segment, type, calibre, quantité, conducteurs protégés éventuels, version de méthode et hash d'exigence. Tout changement qui modifie l'exigence passe le choix à `stale`, puis invalide le câble aval.

## Contrat câble

Entrées utilisateur exactes : longueur, matériau, mode de pose, chute maximale. Entrées dérivées : segment, phase, courant/tension et choix de protection. Sorties : sections thermique et chute, contrainte gouvernante, section normalisée, chute réelle et conformité.

Les valeurs dérivées ne sont jamais réacceptées comme saisies utilisateur. Aucune section normalisée satisfaisante produit un diagnostic et une sortie indisponible.
