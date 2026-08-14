# Spécification — UI AIO, tranche Page 1

**Roadmap** : `UI-AIO-001`
**Tranche d'exécution** : `UI-AIO-001A2-WEATHER-NEEDS-E2E`
**Statut** : en cours de convergence

## But

Faire de Site/Météo et Besoins une frontière d'entrée fiable pour le moteur AIO. L'interface validée est conservée; ses états prototypes et ses calculs simulés sont remplacés par les contrats canoniques et l'enveloppe AIO convergée.

## Scénarios d'acceptation

### US1 — Télécharger ou importer une TMY réelle

L'ingénieur localise un site, télécharge une TMY JSON depuis le port PVGIS versionné ou importe un JSON PVGIS déjà obtenu, vérifie les 8 760 pas et la provenance, puis l'enregistre explicitement. Le logiciel calcule la POA, les douze irradiations journalières mensuelles et les profils moyens sous l'orientation courante. Une source sans fichier contrôlé n'est jamais proposée.

### US2 — Recenser les appareils et leurs horaires

L'ingénieur saisit plusieurs appareils classiques et inductifs, leurs grandeurs explicites et leurs 24 fractions de fonctionnement. Le système dérive une seule série de 24 énergies et les événements de démarrage sans dupliquer une énergie quotidienne éditable.

### US3 — Fournir directement un profil horaire

L'ingénieur saisit 24 puissances moyennes et 24 pointes. Chaque pointe est supérieure ou égale à la puissance moyenne; les unités W à la frontière deviennent Wh sur chaque intervalle exact d'une heure.

### US4 — Estimer depuis une facture

L'ingénieur saisit l'énergie observée, les dates ou le nombre exact de jours et choisit un profil normalisé sourcé. L'estimation conserve la même énergie journalière et annonce sa méthode et sa qualité; le compteur ne fabrique pas une pointe transitoire.

### US5 — Produire le bilan Page 1

Le mode actif est normalisé en `CanonicalDailyLoadV1`, adapté en requête AIO et calculé hors React. L'UI affiche énergie AC journalière, pic coïncident et puissance de démarrage lorsqu'ils sont disponibles, sinon les contraintes correspondantes.

### US6 — Comparer besoins et soleil

L'ingénieur voit sur la même journée les puissances moyenne et de pointe et l'irradiance POA moyenne. Le moteur calcule `γ`, part de l'énergie demandée pendant les heures dont la POA atteint le seuil déclaré. Sans série réelle alignée, `γ` reste indisponible et n'est jamais remplacé par zéro.

## Exigences

- **FR-P1-001** — Utiliser `ProjectInputsV1` comme unique état éditable et supprimer les écritures parallèles `inputs.localityId` et `inputs.loads`.
- **FR-P1-002** — Une seule autorité de charge est active selon `profile.source`; les brouillons des autres modes peuvent être conservés mais ne participent pas au calcul.
- **FR-P1-003** — Les horaires d'appareils contiennent 24 fractions finies `[0,1]`; leur somme est la durée quotidienne.
- **FR-P1-004** — Les calculs de ligne et de normalisation vivent dans une couche pure testée, jamais dans React.
- **FR-P1-005** — L'estimation facture exige une période exacte et un `NormalizedHourlyProfile` sourcé; aucun mois conventionnel de 30 jours.
- **FR-P1-006** — La ressource solaire identifie 12 valeurs POA, orientation, période, source et provenance; inconnue et zéro restent distincts.
- **FR-P1-007** — Le mois critique est déclaré par l'utilisateur; une recommandation du minimum sourcé peut être montrée sans sélection silencieuse.
- **FR-P1-008** — Le bilan public vient exclusivement de `AioSizingEnvelopeV1` avec version, hash, warnings, contraintes et traces.
- **FR-P1-009** — Toute modification technique rend l'ancien résultat `stale`; une réponse asynchrone obsolète ne remplace jamais le projet courant.
- **FR-P1-010** — Les composants, la navigation, le clavier, FR/EN et le responsive du design validé sont préservés.
- **FR-P1-011** — Un fichier PVGIS JSON est accepté seulement si sa structure, ses coordonnées, ses 8 760 pas, ses variables GHI/DNI/DHI et son hash sont valides; chaque rejet est explicite.
- **FR-P1-012** — La transposition produit `POA = direct + diffuse Klucher + réflexion sol` depuis la TMY réelle, la position solaire NOAA, l'orientation et l'albédo explicitement sourcé.
- **FR-P1-013** — Les 12 mensuelles sont `Σ POA_h × 1 h / jours / 1000`; les profils moyens horaires sont agrégés depuis les mêmes 8 760 valeurs sans reconstruction synthétique.
- **FR-P1-014** — `γ = Σ E_h[POA_h ≥ Ir_min] / Σ E_h`; le ratio est borné `[0,1]`, non arrondi dans le moteur et indisponible si charge ou météo manque.
- **FR-P1-015** — Le graphe Besoins superpose uniquement des séries issues des enveloppes courantes : puissance moyenne, pointe et POA; ses légendes, unités et états vides correspondent au design validé.
- **FR-P1-016** — Le téléchargement utilise un port réseau PVGIS 5.3 explicite avec timeout, annulation, erreurs HTTP et prévisualisation; l'import fichier demeure la voie hors ligne.
- **FR-P1-017** — L'albédo de transposition vaut `0,20` sous l'hypothèse sourcée `ASSUMP-P1-001`, reste visible dans la preuve et pourra être remplacé par une entrée explicite dans une tranche approuvée; il n'est jamais présenté comme une mesure du site.
- **FR-P1-018** — L'alignement charge/soleil exige un fuseau IANA sourcé. La ressource Bombouaka déclare `Africa/Lome`; un import sans fuseau reste analysable en UTC mais ne produit pas `γ` avant déclaration du fuseau.
- **FR-P1-019** — Le dialogue météo conserve les parcours validés par nom de localité, par coordonnées GPS et par fichier. Les parcours nom et GPS convergent vers le même port PVGIS réel; un fichier embarqué ne remplace pas ces parcours.
- **FR-P1-020** — La durée quotidienne est saisie directement dans la colonne `Heures`. Le dialogue global ne change que ses positions sur 24 h et doit conserver exactement la durée, y compris une éventuelle fraction décimale.
- **FR-P1-021** — Une nouvelle charge reprend les valeurs validées de `design-proposition` et reçoit immédiatement un horaire cohérent : classique `Nouvel appareil / 1 / 100 W / 0,90 / 4 h`, inductive `Nouveau moteur / 1 / 500 W / 0,85 / coefficient 3 / 2 h`.
- **FR-P1-022** — La bordure droite de Besoins affiche le graphe permanent validé depuis les enveloppes courantes : charge moyenne, dépassement de démarrage, POA, énergie, puissance, pointe et `γ`. Le bloc `Viabilité · SVI` garde sa composition sans valeur fabriquée.

## Frontières

- `Ir_min` alimente seulement `CALC-P1-011` (`γ`) dans cette tranche.
- LPSP, LOLP, SRI, simulation SOC, sélection d'équipements, finance et documents restent hors tranche `SIM-001` ou ultérieure.
- Le téléchargement météo live et l'import utilisent le même parseur strict; aucun mode simulé n'existe.
- `UI-AIO-001B-PRESIZING` affichera les autres sorties PV, batterie et onduleur après convergence de cette tranche.

## Définition de fini

Les six scénarios fonctionnent après sauvegarde/rechargement en mémoire, les résultats changent avec l'orientation, les horaires et le mode attendu, les inconnues bloquent sans fallback, les tests couvrent la TMY réelle et les trois modes, et la validation navigateur correspond au design approuvé.
