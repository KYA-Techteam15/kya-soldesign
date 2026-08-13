# Checklist de qualité — AIO Core

**But**: vérifier que les exigences sont implémentables et vérifiables.  
**Feature**: [spec.md](../spec.md)

## Qualité du contenu

- [x] Le périmètre AIO et les exclusions roadmap sont explicites.
- [x] Les scénarios P1 définissent les critères d'acceptation observables.
- [x] Les termes énergie, puissance, PSH, stockage utile et capacité nominale sont distingués.
- [x] Les données administratives et techniques sont séparées.

## Complétude et clarté

- [x] Chaque entrée nécessaire a une unité, une plage et un comportement d'absence.
- [x] Chaque sortie a un statut `available` ou `blocked`, sans `null` ambigu.
- [x] Les données facture, directes et appareil ont une règle de normalisation distincte.
- [x] La série météo réellement nécessaire, sa période et sa provenance sont définies.
- [x] Les limites de l'orientation et les incohérences GHI/POA sont couvertes.
- [x] Les charges inductives et le multiplicateur de démarrage sont couverts.
- [x] Les formules, sources, résultats et tests se croisent dans le registre.

## Cohérence et gouvernance

- [x] Aucun défaut historique n'est promu au rang d'hypothèse AIO.
- [x] Les sorties excluent explicitement simulation, matériel, sûreté, finance et documents.
- [x] Le contrat respecte unité, hash, provenance, warnings, contraintes et trace de la Constitution.
- [x] Les décisions humaines réservées (goldens/sources/chimie) sont signalées.

## Notes

Révision SpecKit 2026-08-13 : 15/15 critères satisfaits; aucune marque `NEEDS CLARIFICATION`.
