# Roadmap produit page par page

Cette roadmap définit l'ordre de construction de la nouvelle base. Chaque page est une tranche verticale : intention historique auditée, contrat, moteur pur, adaptateur, interface, persistance, tests et preuve navigateur.

## Gates communes

Une page ne passe à la suivante que si :

- tous les champs visibles ont une destination explicite ;
- les calculs sont versionnés, traçables et testés hors interface ;
- les états manquants, bloqués, obsolètes et en erreur sont visibles ;
- le projet et son état de navigation se rechargent correctement ;
- les tests et gates du dépôt passent ;
- une validation navigateur confirme desktop, fenêtre contrainte et clavier ;
- les différences avec `ksd_app` sont documentées.

## Séquence

1. **Fondations transversales** — contrats canoniques, provenance, unités, moteur pur, ports applicatifs et persistance durable.
2. **Page 1 AIO** — Site/Météo et Besoins, trois modes, bilan, sauvegarde, rechargement et restauration de route/onglet. Gate `PAGE1-001` : terminee, preuve dans `convergence.md`.
3. **Hypothèses et scénarios** — hypothèses techniques, variantes et scénarios de conception, sans dupliquer les entrées de Page 1.
4. **Matériel** — sélection et compatibilité modules, batteries et AIO avec données sourcées.
5. **Protections et câblage** — sections, protections et contrôles électriques fondés sur des règles versionnées.
6. **Chiffrage** — coûts, remplacements, flux, LCOE et hypothèses financières.
7. **Dossier et documents** — synthèse, rapport, synoptique et exports.
8. **Simulation horaire et fiabilité** — bilan horaire, autonomie, énergie non servie, écrêtage et état du stockage.
9. **Application desktop** — Tauri, stockage local, worker et packaging, après validation des flux métier.
10. **Systèmes additionnels, un à un** — contrôleur/onduleur séparés, raccordé réseau, PV-diesel hybride, pompage, puis éclairage public.

L'ordre pourra évoluer uniquement à la suite d'une décision documentée par un contrat et ses dépendances. L'arrivée de nouveaux systèmes ne justifie pas de pré-implémenter leurs modèles dans la Page 1.
