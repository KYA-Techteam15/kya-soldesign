# Contract — Persistance hors ligne et transition Tauri

## Autorités

- le document JSON versionné est l’autorité métier portable d’un projet ;
- SQLite est l’autorité opérationnelle locale sous Tauri ;
- le classeur Excel n’est jamais une autorité persistante ;
- le cache réseau ne remplace jamais une provenance météo.

## Transaction météo

Une confirmation réussie doit produire atomiquement :

1. upsert de la localité et de ses noms localisés ;
2. insertion/réutilisation du fichier météo par hash ;
3. rattachement météo ↔ projet ;
4. mise à jour du JSON canonique et de `updatedAt` ;
5. création d’une révision récupérable.

Une erreur laisse les cinq éléments dans leur état précédent.

## Compatibilité navigateur

Avant Tauri, les mêmes garanties sont simulées par un service applicatif qui
prépare toutes les valeurs, écrit les stores IndexedDB nécessaires puis ne publie
le nouvel état React qu’après succès. Les tests injectent une panne à chaque étape.

## Concurrence

La commande porte `expectedProjectUpdatedAtIso`. Une révision différente produit
`PROJECT_REVISION_CONFLICT`; elle n’écrase pas les changements plus récents.

## Déduplication

Deux téléchargements de même SHA-256 réutilisent le même artefact météo. Une
localité peut référencer plusieurs sources/version/orientations sans écrasement.

## Export

L’export projet reste autoportant conformément au format public approuvé. Si la
série météo est externalisée en stockage opérationnel, l’adaptateur d’export doit
la réhydrater dans l’enveloppe avant validation et écriture du fichier.

