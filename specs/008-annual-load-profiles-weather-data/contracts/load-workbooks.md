# Contract — Classeurs de charges

## Classeur équipements

Format : `.xlsx` ; feuille obligatoire : `Equipements`.

| Identifiant canonique | Type | Règle |
|---|---|---|
| `designation` | texte | non vide |
| `quantite` | entier | `>= 1` |
| `puissance_unitaire_W` | nombre | fini, `> 0` |
| `rendement` | nombre | `> 0` et `<= 1` |
| `coefficient_demarrage` | nombre/vide | vide = classique ; sinon `>= 1` |
| `heures_usage` | nombre | `[0,24]` |
| `h00`…`h23` | nombre/vide | toutes vides ou toutes dans `[0,1]` |

Tolérance de somme proposée :
`abs(sum(h00..h23) - heures_usage) <= 1e-9`.

Les colonnes inconnues produisent un avertissement. Une colonne obligatoire
absente, dupliquée ou ambiguë produit une erreur. Les colonnes dérivées et la
simultanéité ne font pas partie du contrat.

### Défaut horaire

Lorsque `h00..h23` sont toutes vides :

```ts
hourlyOperatingFractions = defaultOperatingFractions(heuresUsage, 8)
```

L’inspection ajoute `HOURS_DEFAULTED_FROM_DURATION` avec la ligne concernée.

## Fichier de profil horaire

Format `.xlsx` ou `.csv` selon l’action ; exactement trois colonnes :

| Identifiant | Règle |
|---|---|
| `heure` | entier unique `0..23` |
| `puissance_moyenne_kW` | fini, `>= 0` |
| `puissance_pointe_kW` | fini, `>= puissance_moyenne_kW` |

Exactement 24 lignes utiles sont exigées. Les lignes vides terminales sont
ignorées ; toute autre ligne ou colonne utile est contrôlée.

## Langues

Le parseur accepte une table fermée d’alias français et anglais. L’export écrit
les libellés de la langue active et une propriété de document indiquant la
version du contrat. La langue n’altère ni unités ni valeurs.

## Atomicité

```text
ouvrir → parser → normaliser → valider toutes les cellules → prévisualiser
       → confirmer → commit unique
```

Aucune structure mutable du projet n’est passée au parseur. Un résultat invalide
n’expose aucune commande de commit.

