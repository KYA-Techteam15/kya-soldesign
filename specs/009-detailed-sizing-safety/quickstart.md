# Quickstart de validation — Dimensionnement détaillé et sécurité électrique

## Prérequis

- dépendances installées dans `kya-sol-design-next` ;
- jeu catalogue KYA validé ;
- projet AIO avec prédimensionnement valide ;
- goldens électriques et politique d'arrondi approuvés.

## Contrôles automatisés

Depuis `kya-sol-design-next` :

```powershell
pnpm typecheck
pnpm test:unit
pnpm test:property
pnpm test:golden
pnpm test:data
pnpm test:integration
pnpm test:e2e
```

À chaque phase, exécuter `pnpm verify:phase`. À la fermeture, exécuter `pnpm verify` puis `git diff --check`.

## Scénario 1 — Coût du stockage

1. Ouvrir les hypothèses économiques.
2. Choisir la saisie assistée du stockage.
3. Entrer 10 kWh et 1 500 000 FCFA.
4. Vérifier 150 000 FCFA/kWh, confirmer, recharger.
5. Vérifier la même valeur et la provenance projet.

Attendu : aucune tension ni capacité Ah n'est demandée ; une valeur nulle bloque avec un message ciblé.

## Scénario 2 — Catalogue KYA/utilisateur

1. Filtrer les modules par fabricant, technologie et puissance.
2. Tenter de modifier une référence KYA.
3. La dupliquer, modifier la copie et l'enregistrer.
4. Retrouver la copie avec les mêmes filtres dans le sélecteur.
5. Ouvrir un projet utilisant l'ancienne version après une nouvelle modification.

Attendu : KYA reste immuable ; le projet garde son snapshot ; la copie est éditable et liée à sa source.

## Scénario 3 — Dimensionnement manuel

1. Laisser l'optimisation désactivée.
2. Choisir explicitement module, batterie et onduleur.
3. Lancer le dimensionnement.
4. Vérifier série/parallèle, valeurs requises/obtenues, contraintes et estimation principale.
5. Modifier une sélection.

Attendu : seules les références choisies sont utilisées ; le résultat devient obsolète après modification.

## Scénario 4 — Optimisation configurée

1. Activer l'optimisation.
2. Laisser les modules libres, autoriser deux batteries et imposer un onduleur.
3. Choisir l'objectif proximité puis exécuter.
4. Vérifier que toutes les propositions respectent les scopes.
5. Comparer écarts, quantités, estimation et justification.
6. Confirmer une proposition.

Attendu : aucune proposition n'est appliquée avant l'étape 6 ; deux runs identiques donnent le même ordre.

## Scénario 5 — Protections

Pour chaque tronçon :

1. Vérifier l'exigence calculée et les types proposés.
2. Vérifier qu'aucun calibre n'est confirmable avant le choix du type.
3. Choisir le type.
4. Contrôler que tous les calibres affichés respectent les deux bornes lorsqu'elles existent.
5. Choisir et confirmer le calibre.

Attendu : PV propose gPV/DC, batterie gG/DC, charges AC ; même l'option AC unique exige confirmation.

## Scénario 6 — Câbles

1. Pour chaque tronçon, saisir longueur, matériau, mode de pose et chute maximale.
2. Vérifier que toutes les autres colonnes sont non modifiables.
3. Noter section et chute réelle.
4. Changer le calibre de protection puis revalider.

Attendu : le câble devient obsolète puis se recalcule ; la contrainte gouvernante est affichée.

## Scénario 7 — Rechargement, langues et accessibilité

1. Recharger après chaque état : manuel valide, optimisation proposée, protection incomplète, câble valide.
2. Basculer français/anglais.
3. Refaire les choix au clavier à 1024 px et 1440 px.

Attendu : les états sont fidèles, aucun sens ne dépend de la couleur, aucun champ ou action principal n'est inaccessible.
