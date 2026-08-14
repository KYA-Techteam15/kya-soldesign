# Carte des fichiers d'implémentation

## Fichiers à modifier

| Fichier | Responsabilité |
|---|---|
| `ROADMAP.md` | états AIO/UI-AIO |
| `apps/desktop/src/app/models/projectInputs.ts` | météo sourcée, mois critique, horaires par appareil, période facture |
| `apps/desktop/src/app/models/projectView.ts` | projection éditable du design, sans nouvelle autorité calculatoire |
| `apps/desktop/src/app/models/projectAdapters.ts` | conversion vue ↔ projet sans `null → 0` dans la chaîne AIO |
| `apps/desktop/src/app/ProjectSessionProvider.tsx` | expose déjà le projet canonique courant au port de calcul; aucun changement requis |
| `apps/desktop/src/app/CalculationProvider.tsx` | composer le vrai port Page 1/AIO |
| `apps/desktop/src/routes/workshop/SectionSite.tsx` | raccorder le composant actif Site/Météo au modèle canonique |
| `apps/desktop/src/routes/workshop/SectionBesoins.tsx` | terminer les trois modes dans le composant réellement routé |
| `apps/desktop/src/shell/DayBalance.tsx` et `VerdictPanel.tsx` | afficher exclusivement le bilan AIO disponible/stale/bloqué |
| `apps/desktop/src/i18n/index.ts` | textes complets et diagnostics FR/EN |
| `apps/desktop/src/styles/app.css` | uniquement les styles déjà justifiés par le design validé |

## Fichiers à créer

| Fichier | Responsabilité |
|---|---|
| `packages/engine/src/load-profile/contracts.ts` | résultats/issues de normalisation |
| `packages/engine/src/load-profile/equipment.ts` | lignes, fractions horaires et événements de démarrage |
| `packages/engine/src/load-profile/direct.ts` | validation du profil direct réel/pointe |
| `packages/engine/src/load-profile/meter.ts` | période exacte + profil sourcé |
| `packages/engine/src/load-profile/index.ts` | façade exportée minimale |
| `apps/desktop/src/app/adapters/projectToAio.ts` | composition projet → requête |
| `apps/desktop/src/app/adapters/aioCalculations.ts` | implémentation de `CalculationCapabilityPort` |
| `apps/desktop/src/routes/workshop/OperatingHoursDialog.tsx` | édition accessible des 24 fractions par appareil |

## Tests à créer ou étendre

| Fichier | Preuve |
|---|---|
| `packages/engine/test/unit/page1-load.unit.test.ts` | énergie, simultanéité, fractions, minuit, démarrages, direct et facture |
| `packages/engine/test/property/page1-load.property.test.ts` | conservation, linéarité et jours observés exacts |
| `apps/desktop/test/integration/page1-aio.integration.test.ts` | projet → moteur sans React |
| `apps/desktop/test/unit/project-inputs.unit.test.ts` | site/météo et forme canonique inconnue sûre |
| `apps/desktop/test/integration/project-view-session.integration.test.ts` | round-trip des vues actives sans preuve fabriquée |
| `apps/desktop/e2e/page1.spec.ts` | parcours navigateur des trois modes et focus |

`apps/desktop/src/main.tsx` sert `App.tsx`, qui route les composants de `routes/workshop`. Le stack `features/workshop` n'est pas une cible de cette tranche. Les noms de tests peuvent être ajustés mécaniquement à la convention Vitest réelle, mais aucune responsabilité ne peut être déplacée dans React.
