# Spécification — Convergence de la Page 1 AIO

**Identifiant** : `PAGE1-001`  
**Parent** : `UI-AIO-001`  
**Statut** : convergee et acceptee pour le perimetre defini ci-dessous
**Porte de sortie** : PAGE2 reste fermee jusqu'a la decision de la prochaine tranche produit

## Objectif

Faire de la Page 1 une tranche métier complète et fiable : localiser le site,
obtenir et conserver une météo contrôlée, définir les besoins, calculer le
bilan AIO lorsque les données le permettent, et retrouver exactement le
projet à son prochain lancement.

La nouvelle application conserve l'intention utile de `ksd_app` et son design
validé. Elle ne recopie pas les formules ou les champs historiques lorsqu'ils
sont des doublons, des placeholders, des sorties non traçables ou des champs
sans effet. Chaque différence volontaire doit être documentée.

## Périmètre

La tranche couvre :

- `/projet/:id/atelier/site` : localisation, coordonnées, orientation, météo,
  téléchargement PVGIS, import, prévisualisation, analyse et provenance ;
- `/projet/:id/atelier/besoins` : recensement des appareils, saisie horaire
  directe, estimation depuis facture, profils horaires et dialogue des heures ;
- le bilan AIO commun aux trois modes de charge ;
- la persistance durable du projet et des fichiers météo ;
- la restauration de la route, de la section, de l'onglet et du profil actif ;
- les états `empty`, `loading`, `blocked`, `error`, `stale` et `ready` ;
- tests unitaires, intégration, rechargement et validation navigateur.

Restent hors périmètre : simulation SOC et fiabilité, choix d'équipements,
protections, finance, dossier documentaire, systèmes raccordé réseau,
PV-diesel, pompage et éclairage public. Ces capacités arriveront après la
fermeture de la porte Page 1, chacune dans sa propre tranche.

## Décisions de stratégie

1. `ProjectInputsV1` est l'unique état éditable validé. Les trois modes peuvent
   conserver des brouillons, mais `source` désigne une seule autorité de calcul.
2. Les formules restent dans `packages/engine`. React ne calcule pas et ne
   transforme pas silencieusement une valeur invalide.
3. Une valeur visible doit avoir une destination explicite : calcul, diagnostic,
   provenance/qualité, état indisponible justifié, ou suppression de l'interface.
4. Une donnée météo téléchargée est un artefact persistant, identifié par son
   hash et sa provenance. Le redémarrage ne doit pas dépendre d'un store mémoire.
5. Une modification des entrées invalide le résultat précédent en `stale`. Une
   réponse asynchrone ancienne ne peut pas écraser la révision courante.
6. Les inconnues restent distinctes de zéro. Aucun résultat de démonstration,
   fallback ou profil synthétique ne doit être présenté comme un calcul réel.
7. Le style de `ksd_app` est une référence d'ergonomie et de hiérarchie :
   heures lisibles `00` à `23`, focus continu pendant la saisie, cases cochées
   dans le vert de l'entreprise, et navigation persistante.

## Matrice obligatoire des champs

Avant de fermer la page, cette matrice doit être complétée dans le code et les
tests. Un champ affiché sans ligne de décision est un défaut de produit.

| Zone | Champ ou contrôle | Décision obligatoire |
|---|---|---|
| Site | pays, ville, rechercher | localisation et requête PVGIS traçables |
| Site | latitude, longitude | décimaux signés uniquement, bornes géographiques, validation bloquante |
| Site | fuseau IANA | alignement charge/soleil ; indisponibilité explicite s'il manque |
| Site | orientation, inclinaison, albédo | transposition POA ; hypothèses visibles et sourcées |
| Météo | télécharger/importer, fichier choisi | artefact contrôlé, hash, 8 760 pas et provenance |
| Météo | prévisualisation et analyse | état réel, erreurs explicites, valeurs calculées depuis le fichier |
| Besoins | appareil, quantité, puissance, rendement | énergie et puissance validées dans la normalisation |
| Besoins | heures et fractions 24 h | durée conservée exactement ; saisie continue jusqu'à validation |
| Besoins | facteur de démarrage | puissance de démarrage seulement si la grandeur est disponible et justifiée |
| Besoins | puissance moyenne 24 h | série directe et énergie quotidienne |
| Besoins | pointe 24 h | validation `pointe >= moyenne` ; magnitude transitoire non inventée |
| Facture | énergie observée, jours exacts | énergie quotidienne selon la période réelle |
| Facture | profil horaire sourcé | normalisation horaire ; blocage sans profil valide |
| Facture | ampérage, réseau, pointes matin/soir | calcul ou diagnostic traçable ; sinon indisponible ou retrait |
| Facture | importance de pointe, qualité cible | calcul/diagnostic documenté ou retrait ; jamais décoratif |
| Profils | annuel, hebdomadaire, journalier, mensuel, périodes, combiné | implémentation réelle ou option désactivée avec état explicite |
| Navigation | onglet, route, profil actif | sauvegarde et restauration au redémarrage |

## Contrats de persistance

Le projet doit être sauvegardé derrière un port applicatif durable. Le format
public garde sa version et reçoit une migration explicite lorsqu'un champ est
ajouté. Au minimum, la reprise doit restaurer :

 - l'identité et les entrées validées du projet ;
 - le mode de charge actif et ses brouillons ;
 - la météo téléchargée/importée, ou un artefact local équivalent avec hash,
   chemin contrôlé, provenance et statut de disponibilité ;
 - la route, la section, l'onglet et le profil actif ;
 - les révisions et le statut `stale` du dernier calcul, sans persister un
   résultat qui ne correspond plus aux entrées.

Un redémarrage simulé par destruction des providers mémoire doit prouver que le
projet et la météo sont toujours visibles et utilisables.

## Critères d'acceptation

 - Les trois onglets Besoins ont un contrat complet et un bilan commun cohérent.
 - Les champs sans effet sont reliés à un calcul/diagnostic, rendus
   indisponibles avec explication, ou retirés.
 - Latitude et longitude n'acceptent que des décimaux signés valides, avec
   bornes `[-90, 90]` et `[-180, 180]`.
 - Le champ en cours garde le focus pendant toute la saisie et après chaque
   validation pertinente.
 - Un téléchargement météo réussi est encore présent après fermeture et
   relance ; un fichier invalide n'est jamais proposé comme météo active.
 - La route et l'onglet courants sont restaurés après rechargement sans retour
   arbitraire à la première page.
 - Le bilan change effectivement avec les entrées qui l'alimentent et reste
   bloqué ou indisponible quand une donnée obligatoire manque.
 - Les tests couvrent modèles, moteur, adaptateurs, persistance, stale,
   rechargement, clavier/focus et les trois modes.
 - La validation navigateur est effectuée en desktop et en fenêtre contrainte,
   avec comparaison au design adopté et vérification des états d'erreur/vides.

## Définition de fini et porte de sortie

`PAGE1-001` est terminé uniquement lorsque tous les critères ci-dessus sont
prouvés, que la documentation de convergence est mise à jour, et qu'un
scénario de bout en bout peut : créer un projet, choisir chaque mode, charger
une météo, modifier les besoins, sauvegarder, recharger l'application et
retrouver la même page avec un bilan cohérent.

La page suivante ne démarre qu'après revue de cette preuve et passage des gates
du dépôt. Les systèmes futurs réutiliseront les contrats réellement prouvés,
mais ne sont pas pré-implémentés par anticipation.
