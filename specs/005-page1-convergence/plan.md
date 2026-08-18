# Plan d'implémentation — PAGE1-001

## Phase 1 — Audit et contrat

1. Inventorier les champs, onglets, routes et sorties visibles de Site/Météo et Besoins, puis remplir la matrice du spec.
2. Comparer chaque comportement à `ksd_app` et classer l'historique : `adopt`, `transform`, `compare-only` ou `reject`.
3. Figer les contrats de persistance projet, artefact météo, navigation et migration de version.

## Phase 2 — Persistance et restauration

1. Remplacer la dépendance au store mémoire par le port durable disponible dans l'application.
2. Sauvegarder les entrées, les artefacts météo et l'état de navigation sans stocker de résultat obsolète comme vérité.
3. Ajouter un test de destruction/recréation des providers puis de restauration.

## Phase 3 — Besoins et calculs utiles

1. Finaliser les trois normalisations et leurs validations.
2. Décider chaque champ de facture : effet calculé, diagnostic, indisponibilité ou retrait.
3. Finaliser heures, focus, décimaux signés et cases cochées selon les tokens de l'entreprise.
4. Vérifier que le moteur exploite seulement des entrées validées.

## Phase 4 — Site/Météo et cohérence AIO

1. Garantir téléchargement/import stricts, hash, provenance et disponibilité après redémarrage.
2. Vérifier l'alignement fuseau/POA/gamma et les états bloqués/stale.
3. Raccorder le bilan, les graphes et les diagnostics aux enveloppes courantes.

## Phase 5 — Validation de sortie

1. Exécuter tests unitaires, intégration, E2E et gates du dépôt.
2. Tester desktop, fenêtre contrainte, clavier, focus et rechargement.
3. Documenter les différences avec `ksd_app` et produire la preuve de convergence.
4. Faire revue de la porte Page 1 avant d'ouvrir la page suivante.

Chaque phase doit laisser le dépôt dans un état vérifiable. Une phase ne peut pas être déclarée terminée si une inconnue est masquée par un zéro, un mock ou un résultat conservé en mémoire seulement.
