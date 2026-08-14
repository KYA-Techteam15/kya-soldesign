# Checklist intégration truthful

- [x] Aucun import parent ou `MockEngine` en production.
- [x] Aucune formule/conversion métier dans React.
- [x] Aucun `/30`, fuseau, rendement, simultanéité, profil ou météo par défaut.
- [x] Toutes les sorties visibles viennent d'une enveloppe AIO `ready` actuelle.
- [x] Les issues ont code, chemin et sorties affectées; leur libellé technique reste attaché au code stable.
- [x] Les traces, warnings, contraintes, version et hash restent consultables.
- [x] Les réponses obsolètes sont ignorées.
- [x] Le catalogue ne contient aucune météo sans fichier contrôlé.
- [x] L'orientation recalcule la POA depuis GHI/DNI/DHI et non depuis les mensuelles.
- [x] `γ` vient d'une enveloppe de production courante et reste indisponible sans météo réelle.
