# Guide de validation AIO pour Terra

## Préconditions

1. Lire dans l'ordre `spec.md`, `research.md`, `data-model.md`, les deux contrats, puis `tasks.md`.
2. Ne modifier ni `apps/desktop`, ni `ROADMAP.md`, ni les dossiers parents.
3. Ne pas inventer une source météo, un rendement, une autonomie, une tension, un DoD, un profil de facture ou un multiplicateur de démarrage.

## Cas de référence minimal

Créer un test avec:

- 24 valeurs de charge dont la somme est calculée manuellement;
- une irradiation POA du mois déclaré, avec `SRC-AIO-002` et provenance de dataset;
- des rendements/PR/autonomie/DoD/tension explicitement fournis;
- une batterie `lead-acid`;
- au moins une charge inductive avec multiplicateur.

Le golden doit contenir les valeurs canoniques, le hash, la liste de traces `CALC-AIO-001..007`, et aucune valeur héritée de Python. Le relecteur humain approuve le fichier golden avant son ajout.

## Cas négatifs obligatoires

- PR ou rendement onduleur absent → sortie dépendante `blocked`.
- Météo absente ou irradiation zéro pour une charge positive → PV `blocked`.
- Facture sans profil sourcé → énergie disponible si période connue; série/pic/onduleur `blocked`.
- Chimie différente de plomb → énergie utile disponible; nominale/Ah `blocked`.
- Multiplicateur de démarrage inductif absent → surge `blocked`, continu reste disponible.
- Même entrée technique deux fois → même `inputHash` et même enveloppe, sans dépendance réseau/temps.

## Gates

Après chaque phase: `pnpm verify:phase`. À la fin: `$ksd-calculation-test`, `$ksd-spec-audit`, `pnpm verify`, puis `$speckit-converge`. Documenter toutes les sorties dans `convergence.md`; ne déclarer la feature convergée que si les gates sont verts.
