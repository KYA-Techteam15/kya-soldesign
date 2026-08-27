# Research — Dimensionnement détaillé et sécurité électrique

## R1 — Frontière de la tranche

**Decision**: réunir EQP-001 et SAFE-001 dans un même dossier Speckit, avec une porte de phase stricte : les protections et câbles ne commencent qu'après la stabilité du choix d'équipements.

**Rationale**: les courants et tensions de protection dépendent directement de la configuration détaillée. Une spec commune évite des contrats contradictoires tout en maintenant deux phases de livraison.

**Alternatives considered**: étendre `006-page2-presizing` a été rejeté car cette spec produit des cibles et exclut explicitement le choix détaillé ; créer deux specs immédiatement a été rejeté car les décisions utilisateur portent sur un parcours continu à valider ensemble.

## R2 — Saisie économique du stockage

**Decision**: conserver `coût spécifique = prix total / stockage nominal de référence en kWh`. Le formulaire ne demande ni tension ni Ah. Le coût spécifique en unité monétaire/kWh est la valeur canonique.

**Rationale**: l'utilisateur peut connaître le prix d'un bloc ou parc de stockage sans vouloir décomposer sa constitution électrique. La forme directe et la forme assistée deviennent équivalentes et testables.

**Alternatives considered**: calcul par V × Ah rejeté à la demande utilisateur ; stockage utile rejeté comme base implicite car il mélangerait prix catalogue et hypothèse de profondeur utile. Si un coût utile est souhaité plus tard, il devra être nommé explicitement.

## R3 — Estimation avant finance

**Decision**: calculer une estimation des équipements principaux : puissance PV installée × coût PV spécifique + stockage nominal installé × coût stockage spécifique + puissance onduleur installée × coût onduleur spécifique. Présenter séparément une estimation avec marges si les marges sont renseignées.

**Rationale**: cette estimation permet de comparer les solutions avant l'évaluation financière sans prétendre inclure installation, taxes, protections, câbles, transport ou financement.

**Alternatives considered**: réutiliser le total financier complet rejeté car FIN-001 possède sa propre frontière ; inclure des zéros pour les postes absents rejeté car cela donnerait un faux total exhaustif.

## R4 — Propriété et version du catalogue

**Decision**: origine `kya` immuable et origine `user` éditable ; toute duplication crée un nouvel identifiant utilisateur avec `derivedFromId`; toute modification crée une nouvelle version. Le projet conserve un snapshot immuable.

**Rationale**: la reproductibilité d'un calcul commercial interdit qu'une correction ultérieure du catalogue modifie silencieusement un ancien projet.

**Alternatives considered**: référence vivante par identifiant rejetée pour absence de reproductibilité ; copie sans ascendance rejetée car elle perd la traçabilité.

## R5 — Filtres

**Decision**: un registre de descripteurs de filtres par famille alimente à la fois la page Catalogue et les sélecteurs. Les critères dépendants recalculent leurs options sur le sous-ensemble restant.

**Rationale**: le catalogue actuel possède déjà des filtres structurés tandis que le sélecteur n'a qu'une recherche texte. Deux implémentations séparées dériveraient rapidement.

**Alternatives considered**: conserver la seule recherche dans le sélecteur rejeté ; répliquer manuellement les contrôles dans chaque dialogue rejeté.

## R6 — Parcours manuel et optimisation

**Decision**: le choix manuel reste le défaut. L'optimisation est une commande distincte, désactivée initialement, et ne modifie pas le projet avant confirmation.

**Rationale**: le concepteur doit pouvoir imposer son matériel et comprendre chaque conséquence. L'optimisation est un outil d'aide, pas une autorité silencieuse.

**Alternatives considered**: optimisation automatique au chargement rejetée ; optimisation remplaçant immédiatement les choix rejetée ; mélange des résultats manuels et optimisés rejeté.

## R7 — Champ de recherche de l'optimisation

**Decision**: chaque famille utilise exactement un mode : `fixed`, `shortlist` ou `free`. Les contraintes de sécurité restent obligatoires ; seules les préférences et limites de surdimensionnement sont configurables.

**Rationale**: ces trois modes couvrent le besoin d'imposer, de proposer une liste ou de donner toute flexibilité, sans exposer des poids opaques.

**Alternatives considered**: poids numériques libres rejetés pour manque d'explicabilité ; désactivation des contraintes électriques rejetée pour sécurité.

## R8 — Génération des candidats

**Decision**: pour chaque triplet autorisé, énumérer les configurations entières admissibles, rejeter celles qui ne couvrent pas les minima ou violent tension DC, MPPT, Voc froid, courant, puissance PV, charge ou parallélisation, puis conserver les résultats accompagnés de diagnostics.

**Rationale**: l'arrondi des quantités rend l'espace discret ; une solution continue arrondie après coup peut devenir invalide.

**Alternatives considered**: prendre la première configuration valide rejeté ; optimiser uniquement chaque famille séparément rejeté car les contraintes sont couplées.

## R9 — Classement déterministe

**Decision**: utiliser des comparaisons lexicographiques, sans poids cachés.

- Proximité : minimum du maximum des trois surdimensionnements, puis de leur somme, puis coût complet disponible, puis nombre d'unités, puis clé stable.
- Coût : minimum du coût principal complet, puis proximité, puis nombre d'unités, puis clé stable.
- Composants : minimum du nombre total, puis proximité, puis coût complet disponible, puis clé stable.

**Rationale**: chaque classement peut être expliqué ligne par ligne et reproduit.

**Alternatives considered**: score pondéré rejeté car deux poids différents peuvent inverser une décision sans explication métier ; Pareto seul rejeté car il ne fournit pas d'ordre pratique, mais le front non dominé peut être affiché en complément.

## R10 — Principe de protection de `core` version 1

**Decision**: migrer l'intention suivante, pas les défauts d'implémentation : calculer une plage de courant et une tension, proposer les types admis par tronçon, attendre le choix utilisateur, puis filtrer une série normalisée et attendre le choix du calibre.

Références inspectées :

- `core/service/protection_element.py`
- `core/service/protection_element_sizing_service.py`
- `core/views_models/protection_element_between_PV_field_and_inverter_view_model.py`
- `core/views_models/protection_element_between_inverter_batteries_view_model.py`
- `core/views_models/protection_element_between_inverter_load_view_model.py`

**Rationale**: la version 1 respecte le rôle du concepteur dans le choix gPV/gG/disjoncteur et utilise le calibre retenu pour la suite.

**Alternatives considered**: catalogue commercial inspiré de `ksd_app` rejeté pour cette phase ; sélection automatique du type rejetée explicitement par l'utilisateur.

## R11 — Corrections nécessaires par rapport à la version 1

**Decision**: appliquer toute plage calculée. Les requêtes historiques `getFuseGpvCalibers`, `getFuseGgCalibers` et `getCircuitBreakerDCCalibers` n'utilisent parfois que la borne basse malgré un tuple à deux bornes ; ce comportement n'est pas normatif. Les séries, coefficients et formules doivent recevoir des identifiants de source et des goldens approuvés.

**Rationale**: copier un bug SQL contredirait la vérité calculatoire et pourrait proposer un calibre supérieur à la borne admissible.

**Alternatives considered**: comparaison bit à bit avec la version 1 rejetée ; comparaison legacy conservée seulement comme diagnostic non approuvé.

## R12 — Tableau des protections

**Decision**: placer dans l'étape Protections un tableau par tronçon contenant types admissibles, plage de courant, tension, série compatible, type choisi, calibre choisi et quantité. Les filtres locaux sont tronçon, type et visibilité compatible/tous.

**Rationale**: il n'existe pas encore de références commerciales à exposer dans le catalogue matériel. Le tableau est l'endroit où le choix influence immédiatement les exigences.

**Alternatives considered**: ajouter les protections au catalogue général rejeté ; présenter seulement un menu de calibre rejeté car il masque plage et exclusions.

## R13 — Câbles

**Decision**: les seules entrées sont longueur, matériau, mode de pose et chute maximale. Le moteur reçoit aussi les valeurs amont dérivées, mais elles ne sont pas éditables. Le résultat expose les sections thermique et chute, la contrainte gouvernante, la section normalisée et la chute réelle.

**Rationale**: la distinction saisie/résultat est nécessaire à l'audit. Le calibre choisi doit modifier le calcul de section.

**Alternatives considered**: exposer tous les coefficients historiques de pose rejeté pour cette phase ; rendre la section calculée éditable rejeté. Des détails normatifs supplémentaires devront être ajoutés seulement avec sources validées.
