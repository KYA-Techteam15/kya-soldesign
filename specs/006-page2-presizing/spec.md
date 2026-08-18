# Spécification — Page 2 : Prédimensionnement KEG

**Identifiant** : PAGE2-001  
**Parent** : PAGE1-001  
**Statut** : proposition à valider avant implémentation  
**Porte de sortie** : aucune page suivante ne démarre avant la validation de cette tranche

## Objectif

Transformer l’étape « Prédimensionnement » en une capacité calculée et
traçable. Elle doit proposer un système autonome photovoltaïque et batterie à
partir du bilan de charge de la page 1, de son YEn, de la météo locale et des
hypothèses économiques et techniques, puis expliquer clairement la fiabilité
et la viabilité du résultat.

La méthode historique utile de ksd_app est reprise comme référence métier.
Les champs historiques sans effet calculé, les résultats fictifs et les
critères dépréciés LCOA_e/LCOA_p restent exclus.

## Périmètre fonctionnel

La page couvre :

- les critères LPSP maximale, LOLP maximale et tarif réseau de référence ;
- les hypothèses techniques, coûts, durées de vie, maintenance, actualisation
  et facteur d’émission déjà exposées par le dialogue actuel ;
- le lancement explicite du calcul et les états vide, bloqué, en cours, erreur,
  obsolète et prêt ;
- le balayage des configurations de gestion solaire/non solaire ;
- le résultat optimal, les indicateurs techniques, économiques et carbone ;
- l’affichage de la fiabilité et de la viabilité avec leurs valeurs et seuils ;
- la persistance des paramètres, du résultat et de la version des entrées ;
- la restauration de la page et du résultat après rechargement.

Restent hors périmètre : sélection détaillée des équipements, protections,
dimensionnement des câbles, raccordement réseau, diesel, pompage, éclairage
public, optimisation multi-objectifs différente de KEG et simulation de
vieillissement plus fine que celle définie ci-dessous.

## Entrées et unités

| Entrée | Unité UI | Unité de calcul | Règle |
|---|---:|---:|---|
| Énergie quotidienne de la page 1 (Et) | kWh/j | kWh/j | issue du profil actif normalisé |
| YEn de la page 1 (gamma) | % | ratio [0, 1] | valeur naturelle ou forcée effectivement calculée |
| Profil de charge | valeurs horaires | 24 ou 8 760 points | un profil 24 h est répété sur 365 jours |
| Météo | fichier local | 8 760 pas | irradiance horaire, orientation, albédo et provenance obligatoires |
| LPSP maximale | % | ratio [0, 1] | défaut historique : 5 % |
| LOLP maximale | % | ratio [0, 1] | défaut historique : 5 % |
| Rendements, PR, DoD | % | ratios [0, 1] | validation des bornes avant calcul |
| Tension batterie | V | V | strictement positive |
| Coûts spécifiques et tarif | FCFA/kW, kWh ou FCFA/kWh | même unité | marges converties en coût appliqué |
| Durées de vie | ans | ans entiers positifs | remplacements inclus dans le coût cycle de vie |
| Émission et autoconsommation | kgCO2/kWh et % | kgCO2/kWh et ratio | bornes explicites |

Les valeurs absentes restent absentes. Elles ne sont jamais remplacées par
zéro pour faire apparaître un résultat. Les valeurs par défaut historiques
sont appliquées à la création d’un projet et leur provenance est marquée
comme hypothèse par défaut.

## Calculs obligatoires

### 1. Préparation

Le moteur reçoit le profil actif normalisé de la page 1, son énergie
quotidienne Et, le YEn gamma, la météo TMY et la géométrie du site. Le YEn
forcé est donc respecté par la charge horaire ajustée ; la page 2 ne recalcule
pas une autre définition de YEn.

Le moteur doit refuser le calcul si une donnée indispensable est absente ou
incohérente : météo non disponible, moins de 8 760 pas utilisables, profil
actif invalide, YEn hors [0, 1], énergie non positive, orientation absente ou
hypothèse requise hors limites.

### 2. Balayage KEG

Pour alphaA et alphaN dans {0, 0.1, …, 1}, évaluer chaque couple :

1. besoin d’exergie et stockage de production/gestion ;
2. stockage total St, puissance PV Pc, capacité batterie cBat et puissance
   onduleur pInv ;
3. coût d’investissement, maintenance, remplacements et coût cycle de vie LCC ;
4. production annuelle, LCOE, LPSP et LOLP par simulation horaire ;
5. SRI, SVI, CO₂ évité et facteur carbone.

Le balayage contient 121 couples lorsque 0 < gamma < 1. Pour gamma = 0,
alphaA est fixé à zéro ; pour gamma = 1, alphaN est fixé à zéro. Toute
configuration non dimensionnable est comptée et expliquée, pas transformée en
valeur nulle.

### 3. Indicateurs et sélection

Les définitions sont :

    SRI     = (1 - LOLP) × (1 - LPSP)
    SRI_min = (1 - LOLP_max) × (1 - LPSP_max)
    SVI     = LCOE / tarif réseau
    viable  = SVI < 1

La sélection est déterministe :

1. conserver les configurations avec SRI >= SRI_min ;
2. parmi elles, choisir le plus petit SVI ;
3. en cas d’égalité, choisir le plus grand CO₂ évité ;
4. déclarer reliable = true uniquement si l’étape 1 a trouvé une configuration.

Si aucune configuration n’atteint SRI_min, le moteur retourne la configuration
ayant le meilleur SRI, avec reliable = false et un diagnostic visible. Ce
résultat est exploitable pour l’analyse mais ne peut pas être présenté comme
fiable. S’il n’existe aucune configuration dimensionnable, l’état est bloqué
avec le code NO_DIMENSIONABLE_CONFIG.

## Sorties

Le résultat optimal doit fournir, avec unités et trace des entrées :

- couverture analysée ;
- puissance crête PV, puissance onduleur et capacité de stockage ;
- production annuelle ;
- LPSP et LOLP ;
- SRI et SRI_min ;
- LCOE et SVI ;
- statuts reliable et viable ;
- alphaA, alphaN et YEn utilisés ;
- CO₂ évité et facteur carbone ;
- avertissements, diagnostics, version de méthode et hash des entrées.

L’interface affiche au-dessus des résultats un verdict textuel accompagné de
la valeur : « Système fiable »/« Fiabilité insuffisante » et « Système viable »/
« Système non viable ». La couleur ne porte jamais le sens seule. Une sortie
non calculée reste « — » avec sa cause.

Les couvertures 25 %, 50 %, 75 % et 100 % ne sont proposées que si leur règle
est explicitement implémentée et testée. Dans cette tranche, la référence
minimale est le résultat 100 % ; toute déclinaison de couverture doit être
identifiée comme une projection et ne doit pas réutiliser silencieusement les
indicateurs d’une autre configuration.

## Persistance et rechargement

Les paramètres de page 2 sont enregistrés dans ProjectInputsV1 via les champs
d’hypothèses existants, avec migration/version si le contrat change. Le
résultat est conservé avec :

- l’identifiant du projet ;
- le hash de toutes les entrées et de la météo ;
- la version de méthode ;
- le résultat optimal, les diagnostics et les statuts ;
- la date d’exécution.

Une modification d’une entrée, du profil, du YEn, de l’orientation ou de la
météo rend le résultat obsolète et désactive la validation jusqu’à un nouveau
calcul. Le store persistant est la source de vérité après rechargement ; un
cache React ne suffit pas. La page doit rester sur la route courante et
restaurer les paramètres, l’onglet d’hypothèses et le résultat correspondant.

## Critères d’acceptation

- Le bouton de calcul s’active uniquement avec toutes les entrées requises et
  lance réellement le moteur KEG dans packages/engine.
- Un cas contrôlé produit les mêmes dimensions et indicateurs que les
  fonctions de référence de ksd_app, à tolérance numérique documentée.
- Les unités pourcentage/ratio sont converties une seule fois et les seuils
  affichés correspondent aux seuils calculés.
- Le choix optimal respecte successivement SRI, SVI puis CO₂, avec les statuts
  reliable et viable exacts.
- Un cas sans configuration fiable affiche le meilleur SRI avec un avertissement
  explicite ; un cas sans configuration dimensionnable est bloqué.
- Les résultats affichés ne sont jamais des placeholders et leur provenance,
  hash d’entrées et version de méthode sont consultables.
- Une modification rend le résultat obsolète ; un rechargement restaure le
  projet, la page et le résultat persistant lorsque celui-ci est encore valide.
- Les tests ciblés couvrent les formules, le balayage, la sélection, les cas
  limites, les adaptateurs, la persistance et un parcours navigateur.
- L’interface reste lisible en français et en anglais, accessible au clavier,
  et conserve le focus pendant l’édition des champs numériques.

## Plan d’implémentation après validation

1. Contrats de sortie, validations et moteur KEG dans packages/engine.
2. Adaptateur projet, provenance, hash, persistance et invalidation du résultat.
3. UI de lancement, états, verdicts et résultats ; dialogue d’hypothèses.
4. Tests unitaires, intégration, rechargement et E2E ciblé.
5. Revue utilisateur de la page 2 avant toute page suivante.

Les tests seront lancés par tranche, sans suite globale par défaut.
