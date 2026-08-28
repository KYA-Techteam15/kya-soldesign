# Requirements Checklist — PAGE1-002

## Périmètre et vérité métier

- [ ] CHK001 La méthode facture est explicitement conservée.
- [ ] CHK002 La suppression porte seulement sur son encadré explicatif rouge.
- [ ] CHK003 Le besoin simple est distinct des trois organisations composées.
- [ ] CHK004 Ouvrés/week-end, périodes et périodes × jours sont explicitement horaires uniquement.
- [ ] CHK005 Le champ photo possède une stratégie de migration.

## Excel

- [ ] CHK006 Une feuille unique distingue classique/inductif par coefficient.
- [ ] CHK007 `simultaneite_pct` est absent.
- [ ] CHK008 Toutes les bornes de colonnes sont explicites.
- [ ] CHK009 Les heures absentes utilisent l’algorithme existant à 08 h.
- [ ] CHK010 Les erreurs identifient feuille, cellule, valeur et attente.
- [ ] CHK011 Aucun import invalide ne peut muter le projet.
- [ ] CHK012 Le profil horaire possède exactement trois colonnes et 24 lignes ; la pointe vide est normalisée explicitement.

## Calendrier et calcul

- [ ] CHK013 Les jours forment une partition exacte.
- [ ] CHK014 Les périodes couvrent l’année sans trou/chevauchement.
- [ ] CHK015 La formule annuelle utilise `W = N × Etotal`.
- [ ] CHK016 La source fournie par le demandeur possède un identifiant.
- [ ] CHK017 Les contributions locales et l’agrégat sont traçables.
- [ ] CHK018 Le cas énergie nulle est indisponible.
- [ ] CHK019 Le fuseau et les années 8 760/8 784 sont traités.

## Dialogue composé

- [ ] CHK031 Équipement et facture sont absents du modèle composé, pas seulement masqués.
- [ ] CHK032 Les données simples sont conservées inactives et restaurables.
- [ ] CHK033 Organisation, calendrier, matrice et 0 h–23 h sont dans un dialogue unique.
- [ ] CHK034 Le brouillon ne partage aucune référence mutable avec le projet.
- [ ] CHK035 Annuler, fermer ou Escape ne publie aucune modification.
- [ ] CHK036 Appliquer valide tout et produit un seul commit avec contrôle de révision.
- [ ] CHK037 Les nombres attendus sont 2 profils ouvrés/week-end, N profils périodes et 2N profils croisés.
- [ ] CHK038 Copier crée une identité indépendante ; réutiliser annonce le partage.
- [ ] CHK039 Trous, chevauchements, valeurs et combinaisons manquantes nomment leur cible.

## Visualisation annuelle

- [ ] CHK040 La série horaire reste l’autorité indépendamment de la vue.
- [ ] CHK041 Les six plages et cinq fréquences sont définies sans ambiguïté.
- [ ] CHK042 Auto résout une fréquence documentée selon la plage.
- [ ] CHK043 Énergie, moyenne, pointe et POA ont des agrégations distinctes et testées.
- [ ] CHK044 L’année horaire conserve les extrema pendant la réduction de rendu.
- [ ] CHK045 L’export reproduit la plage, fréquence, fuseau, unités et valeurs sélectionnés.
- [ ] CHK046 Changer la vue ne change ni hash, ni YEn, ni résultat scientifique.

## Réseau et persistance

- [ ] CHK020 La cause exacte de la dépendance au proxy Vite est documentée.
- [ ] CHK021 Dev, web production et Tauri ont des adaptateurs distincts.
- [ ] CHK022 Un `dist` statique sans passerelle n’est pas présenté comme fonctionnel.
- [ ] CHK023 La prévisualisation météo n’écrit rien.
- [ ] CHK024 La confirmation météo est atomique.
- [ ] CHK025 Le référentiel pays est complet, actuel et bilingue.
- [ ] CHK026 Les noms de localité sont disponibles hors ligne après téléchargement.
- [ ] CHK027 SQLite et JSON n’introduisent pas deux modèles métier concurrents.

## Validation

- [ ] CHK028 Les gates de format public et formule scientifique sont explicites.
- [ ] CHK029 Les critères sont testables indépendamment de React.
- [ ] CHK030 Les scénarios FR/EN, clavier, relance et panne sont couverts.
- [ ] CHK047 Les tests couvrent annulation sale, conflit de révision et profils partagés.
- [ ] CHK048 Les tests couvrent performance année horaire et conservation d’énergie.
