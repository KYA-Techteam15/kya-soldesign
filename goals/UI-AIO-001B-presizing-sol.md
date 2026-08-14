# Goal UI-AIO-001B-PRESIZING — Prédimensionnement AIO avec Sol

## Objectif à lancer

Finaliser la Page 2 « Prédimensionnement » sur le moteur AIO convergé, en partant strictement du projet canonique et du bilan Page 1. Les hypothèses techniques deviennent explicites, sourcées et invalidables; aucun ratio legacy n'est copié comme valeur par défaut.

## Entrées à implémenter

- rendement onduleur;
- performance ratio PV;
- autonomie en jours;
- chimie batterie;
- profondeur de décharge;
- rendement de décharge batterie;
- tension nominale du parc;
- provenance de chaque hypothèse critique.

## Sorties AIO à afficher

- énergie DC journalière;
- heures de soleil équivalentes du mois critique;
- puissance PV minimale;
- stockage utile minimal;
- stockage nominal et capacité Ah lorsque la chimie le permet;
- puissance onduleur continue et de démarrage;
- contraintes, warnings, version, hash, sources et traces.

## Formules et legacy

Lire `../kyasoldesign/src/ksd_app` uniquement pour inventorier les conventions historiques. Conserver une formule seulement si elle correspond à un contrat AIO déjà sourcé et testé; corriger unités, période et composition dans le moteur, jamais dans React. Tout coefficient non justifié reste inconnu et bloque ses seules sorties dépendantes.

## Fichiers principaux

- `apps/desktop/src/app/models/projectInputs.ts`
- `apps/desktop/src/app/models/projectAdapters.ts`
- `apps/desktop/src/app/adapters/projectToAio.ts`
- `apps/desktop/src/routes/workshop/SectionHypotheses.tsx`
- `apps/desktop/src/shell/DayBalance.tsx`
- `apps/desktop/src/i18n/index.ts`
- `packages/engine/test/unit/aio.engine.unit.test.ts`
- `packages/engine/test/property/aio.property.test.ts`
- `apps/desktop/test/integration/page2-presizing.integration.test.ts`
- `apps/desktop/e2e/presizing.spec.ts`

## Définition de fini

Les sorties Page 2 proviennent uniquement de l'enveloppe AIO actuelle, chaque hypothèse critique a une provenance, les inconnues bloquent partiellement sans zéro fabriqué, les modifications recalculent le hash, `pnpm verify` est vert, la page est validée dans le navigateur intégré à 1440×1000 et 1024×768, puis le commit est poussé.
