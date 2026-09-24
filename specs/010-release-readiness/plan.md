# Implementation Plan: Version livrable — correctifs de bout en bout et exécutable Tauri

**Branch**: `010-release-readiness` | **Date**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

## Summary

Sept incréments ordonnés par risque : (1) exactitude du moteur, (2) persistance et robustesse,
(3) synchronisation et performance, (4) documents, (5) langue, accessibilité et interface,
(6) hôte Tauri et prérequis logiciels, (7) dépôt autonome et fermeture. Chaque incrément finit sur
`pnpm verify:phase` vert.

## Technical Context

**Language/Version**: TypeScript 7, React 19, Rust 1.95 (hôte Tauri 2)
**Primary Dependencies**: Zod, React Router, docx, SheetJS 0.20.3 ; plugins Tauri http, dialog, fs,
sql, log, single-instance, window-state, updater (feature), process, opener
**Storage**: IndexedDB (navigateur), SQLite (Tauri) derrière `ProjectStore`
**Testing**: Vitest, fast-check, Playwright ; scripts de mesure longtask
**Target Platform**: Windows 10/11 x64 (NSIS), navigateur pour le développement
**Performance Goals**: aucune tâche > 100 ms sur une modification ordinaire
**Constraints**: moteur pur, aucune formule en React, aucun résultat inventé, dépôt déplaçable

## Constitution Check

| Principe | État | Mise en œuvre |
|---|---|---|
| Calculs véridiques | PASS | périmé = indisponible ; documents bloqués sur un dossier incomplet |
| Moteur pur | PASS | bilan horaire, protections, câbles, IEC dans `packages/engine` |
| Traçabilité | PASS | traces non vides, constantes sourcées (research.md) |
| Assurance scientifique | PASS conditionnel | goldens régénérés avec note d'audit ; tableaux IEC à revérifier par un humain |
| Gates | PASS | `verify:phase` à chaque incrément, `verify` en fermeture |
| Migration sûre | PASS | migration localStorage → dépôt, champs projet optionnels rétrocompatibles |
| Périmètre | PASS | aucune nouvelle topologie |

## Architecture

```text
apps/desktop/
├── src/platform/            # détection Tauri + adaptateurs (fetch, fichiers, dépôt, journal, mises à jour)
├── src/app/persistence/     # ProjectStore (IndexedDB | SQLite), file d'écriture, migration
├── src/app/calculation/     # cache par empreinte, worker de balayage
├── src/shell/ErrorBoundary.tsx, SaveStatus.tsx, AboutDialog…
└── src-tauri/               # hôte Rust, capacités, icônes, configuration NSIS
packages/engine/src/
├── simulation/hourly-balance.ts   # bilan unique
└── protection-cabling/iec60364.ts # tableaux normatifs
```

## Risques

- Valeurs IEC transcrites : revue humaine obligatoire (checklist).
- Signature et mises à jour : dépendent de décisions commerciales ; configuration par secrets.
- Taille de l'installateur hors ligne (~130 Mo avec WebView2) : assumée pour les postes sans internet.
