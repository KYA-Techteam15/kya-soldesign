# Preuve de convergence - PAGE1-001

## Verdict

La Page 1 AIO est convergee pour le perimetre defini dans spec.md. La Page 2 reste volontairement fermee jusqu'a une nouvelle decision de produit et un contrat dedie. La revue de sortie et les gates visuels sont passes le 18 aout 2026.

## Comparaison avec ksd_app

| Intention utile | Reprise dans kya-sol-design-next | Decision |
|---|---|---|
| Trois manieres de definir les besoins | Onglets equipments, hourly et meter avec une source de calcul explicite | Adopte et relie au moteur AIO |
| Heures lisibles et edition guidee | Grille 00:00 - 01:00 jusqu'a 23:00 - 00:00, dialogue de positionnement, duree inchangee | Adopte et durci |
| Profil horaire et pointe | 24 valeurs moyennes et 24 pointes, contrainte pointe >= moyenne | Adopte et valide |
| Saisie de facture | Energie observee, jours exacts et profil horaire source | Transforme : les champs sans effet sont retires |
| Localisation et meteo | Localite, fuseau, fichier PVGIS, 8 760 pas, hash, provenance et POA | Adopte avec preuve persistante |
| Navigation par etapes | Huit routes d'atelier, route et projet restaures apres rechargement | Adopte et persiste |
| Profils non livres | Granularites autres qu'annuelle | Desactives avec etat explicite |

## Contrats verifies

- Les calculs restent dans packages/engine et les entrees passent par les adaptateurs canoniques.
- Les inconnues restent distinctes de zero ; les etats empty, loading, error et stale sont visibles.
- Une orientation modifiee invalide le resultat precedent. irradiationBasis n'est mise a jour qu'apres un calcul courant dont la revision correspond au projet.
- Les champs numeriques Besoins conservent leur brouillon et leur focus durant la saisie ; la virgule et le point sont acceptes, les caracteres non decimaux sont rejetes.
- Les fichiers meteo sauvegardes sont restaures par la bibliotheque locale et restent lies au projet.

## Preuves automatisees

- pnpm verify:phase : lint, typecheck, contrats UI, 30 fichiers unitaires, 114 tests unitaires, 14 tests property et 7 tests data passes.
- pnpm test -- --run : 47 fichiers, 153 tests passes.
- Playwright cible : 9 tests passes sur la Page 1, la meteo persistante, la navigation et le viewport contraint.
- `pnpm test:e2e` : 20 tests fonctionnels passes.
- `pnpm test:visual -- --project=chromium` : 14 tests visuels passes aux viewports 1440 et 1024, en francais et en anglais. Les snapshots ont ete actualises pour refleter les etats persistants et les libelles du contrat Page 1.
- git diff --check : aucune erreur de whitespace.
- Detecteur Impeccable : deux avertissements de bordure laterale preexistants dans app.css, conserves car ils appartiennent au langage visuel historique hors de cette correction.

## Porte suivante

La prochaine tranche est SIM-001 ou la tranche produit explicitement decidee apres revue. Elle devra reutiliser les contrats prouves de Page 1 sans ajouter de champs ou de formules dans la Page 1 par anticipation.
