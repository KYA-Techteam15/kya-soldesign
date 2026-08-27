# Visual Acceptance Checklist: Accueil, réglages, catalogue et rapports

**Purpose**: préserver le design produit KYA tout en améliorant hiérarchie, efficacité et accessibilité.  
**Created**: 2026-08-27  
**Feature**: [spec.md](../spec.md)

## Home

- [ ] VIS001 Le logo KYA reste le signal de marque principal en haut à gauche.
- [ ] VIS002 Nouveau projet est l’action dominante ; Projets récents reste visible sans concurrence excessive.
- [ ] VIS003 Le dernier projet et le parcours AIO se comprennent avant la feuille de route.
- [ ] VIS004 Les architectures futures sont compactes, désaturées et explicitement indisponibles.
- [ ] VIS005 L’accueil reprend vert, orange, lignes techniques et grands espaces sans copier une landing page.
- [ ] VIS006 Aucun chiffre institutionnel externe n’est affiché sans source applicative maintenue.
- [ ] VIS007 Le panneau catalogue distingue ready, loading, error et unknown.
- [ ] VIS008 L’état vide offre création et import avec une explication courte.

## Settings

- [ ] VIS009 Les neuf catégories sont repérables sans parcourir une liste continue de champs.
- [ ] VIS010 Coûts et marges PV, batterie et onduleur sont groupés par équipement.
- [ ] VIS011 Fiabilité, conversion et conditions commerciales sont visuellement séparées.
- [ ] VIS012 Unités et aides ne concurrencent pas la valeur saisie.
- [ ] VIS013 Erreur, sauvegarde et réinitialisation ont des états visuels distincts.
- [ ] VIS014 Logo et signature ont un aperçu, un remplacement et une suppression explicites.
- [ ] VIS015 La section Licence ne ressemble pas à une licence active lorsqu’elle est non configurée.

## Projects

- [ ] VIS016 Les actions secondaires de ligne ne concurrencent pas l’ouverture du projet.
- [ ] VIS017 Import, export et duplication ont labels et confirmations explicites.
- [ ] VIS018 Les conflits comparent clairement projet entrant et projet local.
- [ ] VIS019 Le dernier enregistrement et les erreurs restent visibles sans toast uniquement.

## Catalog

- [ ] VIS020 Les libellés et unités changent correctement selon l’onglet.
- [ ] VIS021 Les filtres actifs sont visibles et supprimables.
- [ ] VIS022 Le total et la pagination restent proches du tableau.
- [ ] VIS023 L’état sans résultat ne laisse pas une table vide ambiguë.
- [ ] VIS024 La provenance est consultable au clavier et n’alourdit pas chaque ligne fermée.
- [ ] VIS025 Version et qualité catalogue sont lisibles mais secondaires au choix matériel.

## Reports

- [ ] VIS026 Le logo conserve ses proportions et ne décale pas les métadonnées.
- [ ] VIS027 La page de garde montre client, projet, référence, date, lieu et système.
- [ ] VIS028 La readiness précède l’impression sans masquer l’aperçu.
- [ ] VIS029 Avertissements et blocages ne reposent pas uniquement sur la couleur.
- [ ] VIS030 Les deux pages A4 n’ont ni débordement, ni pied coupé, ni thème sombre imprimé.
- [ ] VIS031 La société, la signature, le pied et la devise sont cohérents entre aperçu et impression.

## Responsive, themes and accessibility

- [ ] VIS032 Captures validées en 1440×900, 1024×700 et largeur 760 px.
- [ ] VIS033 Captures validées en clair et sombre pour accueil, réglages et catalogue.
- [ ] VIS034 Les trois intensités visuelles conservent la même hiérarchie.
- [ ] VIS035 Le focus est visible sur toutes les actions et entrées.
- [ ] VIS036 Aucun contrôle essentiel n’est accessible uniquement au pointeur.
- [ ] VIS037 Les animations réduites suppriment mouvements non essentiels.
- [ ] VIS038 Le contraste des textes, unités, badges et erreurs satisfait WCAG AA.

## Capture evidence

| Surface | Light | Dark | Narrow | Keyboard | Error/empty |
|---|---|---|---|---|---|
| Home | [ ] | [ ] | [ ] | [ ] | [ ] |
| Settings | [ ] | [ ] | [ ] | [ ] | [ ] |
| Projects | [ ] | [ ] | [ ] | [ ] | [ ] |
| Catalog | [ ] | [ ] | [ ] | [ ] | [ ] |
| Report preview | [ ] | N/A | [ ] | [ ] | [ ] |

## Notes

- Les captures sont des preuves, pas des golden baselines à régénérer pour faire
  disparaître une différence non comprise.
- Toute différence volontaire avec le design adopté est documentée avant
  acceptation.
