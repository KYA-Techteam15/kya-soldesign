# Contract — Catalogue et sélection des équipements

## Opérations autorisées

| Origine | Créer | Modifier | Archiver/supprimer | Dupliquer |
|---|---:|---:|---:|---:|
| KYA | non | non | non | oui, vers utilisateur |
| Utilisateur | oui | oui, nouvelle version | oui | oui, vers utilisateur |

Toute commande refusée retourne un code stable et ne produit aucune mutation partielle.

## Duplication

La commande reçoit l'identifiant et la version source. Elle retourne un nouvel identifiant utilisateur, version 1, `derivedFromId` et une copie des caractéristiques. Manufacturer/model peuvent être adaptés dans le brouillon avant validation sans toucher à la source.

## Édition

La commande reçoit l'identifiant utilisateur, la version attendue et les nouvelles données. Un conflit de version refuse l'écriture. Une réussite crée la version suivante et conserve la précédente pour les snapshots.

## Éligibilité

La validation retourne `eligible` ou `ineligible` avec une liste exhaustive de codes et chemins. L'optimisation ignore les références inéligibles mais les affiche avec explication. Le dimensionnement manuel refuse le calcul avec la même liste.

## Filtres partagés

Une définition unique par famille expose recherche texte, valeurs disponibles, plages numériques et compte de résultats. Un filtre dépendant recalcule ses options sur le sous-ensemble produit par les autres filtres. La page catalogue et le sélecteur consomment ce même contrat.
