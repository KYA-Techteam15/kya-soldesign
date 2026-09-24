# Checklist — 010 Release readiness

## Revue humaine obligatoire avant publication

- [ ] Tableaux IEC 60364-5-52 transcrits dans `packages/engine/src/protection-cabling/iec60364.ts`
      comparés à l'exemplaire normatif (B.52.2, B.52.3, B.52.14, B.52.15).
- [ ] Séries de calibres (`RATINGS` dans `protection-cabling/engine.ts`) comparées aux gammes des
      fournisseurs retenus.
- [ ] Ratio de tension de coupure batterie 0,875 validé pour les technologies du catalogue.
- [ ] Brouillons EULA et politique de confidentialité validés juridiquement.

## Décisions commerciales (branchées, non prises)

- [ ] Fournisseur de licence → `LicensePort`.
- [ ] Certificat de signature → secrets du workflow de publication.
- [ ] Hébergement des mises à jour → `TAURI_UPDATER_ENDPOINT` + clé publique.
- [ ] Contrat géocodage commercial → `VITE_OPEN_METEO_API_KEY`.
