# Publier une version

## 1. Préparer

1. Mettre à jour la version dans `apps/desktop/package.json` (l'hôte Tauri la lit).
2. Compléter `CHANGELOG.md` et `apps/desktop/src/app/models/releaseInfo.ts`.
3. `pnpm verify` doit être vert.
4. Revue humaine de `specs/010-release-readiness/checklists/requirements.md`.

## 2. Publier

Pousser une étiquette `vX.Y.Z`. Le workflow `release` construit l'installateur
NSIS sous Windows et crée une publication GitHub **en brouillon**, à relire avant
de la rendre visible.

## 3. Capacités activées par secrets

Aucune de ces décisions n'est figée dans le code. Sans le secret correspondant,
la version est construite sans la capacité, et l'application l'indique.

| Capacité | Secrets / variables du dépôt | Effet |
|---|---|---|
| Signature Authenticode | `WINDOWS_CERTIFICATE` (PFX en base64), `WINDOWS_CERTIFICATE_PASSWORD` | exécutable et installateur signés ; plus d'alerte SmartScreen « éditeur inconnu » |
| Mises à jour automatiques | variables `TAURI_UPDATER_ENDPOINT`, `TAURI_UPDATER_PUBKEY` ; secrets `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | module de mise à jour compilé, `latest.json` publié |
| Géocodage commercial | secret `OPEN_METEO_API_KEY` | appels Open-Meteo sur le domaine commercial (usage commercial soumis à abonnement) |
| Support | variable `SUPPORT_EMAIL` | « Signaler un problème » prépare un courriel ; sinon le rapport est copié |

Clés de mise à jour : `pnpm --filter @ksd/desktop exec tauri signer generate`. La clé
privée ne quitte jamais le coffre de secrets ; perdue, elle empêche toute mise à
jour des postes déjà installés.

### Canaux de mise à jour (spec 012, FR-E1)

- **stable** : `TAURI_UPDATER_ENDPOINT`, par exemple
  `https://github.com/KYA-Techteam15/kya-soldesign/releases/latest/download/latest.json`.
  « latest » ignore les préversions : une bêta ne part jamais vers le canal stable.
- **beta** : variable `TAURI_UPDATER_BETA_ENDPOINT`, compilée dans l'hôte. Elle doit désigner un
  `latest.json` que chaque bêta remplace (publication d'étiquette fixe, ou stockage de fichiers).
  Sans elle, Réglages → À propos ne propose pas le choix du canal.

L'installation se fait en mode `passive` : barre de progression, sans question, puis relance.
Au démarrage, l'application vérifie au plus une fois par jour et annonce une version disponible
dans une boîte avec ses notes (le corps de la publication).

## 4. Installateur

- Images : `apps/desktop/src-tauri/installer/{header,sidebar}.bmp`, générées par
  `pwsh tools/release/installer-art.ps1` à partir du logo.
- Désinstallation : la case « Supprimer les données de l'application » (décochée par défaut)
  efface `%APPDATA%` et `%LOCALAPPDATA%` de l'application — projets, sauvegardes, journaux,
  licence. Décochée, tout est conservé pour une réinstallation. Une mise à jour ne supprime rien.

## 5. Décisions encore ouvertes

- API de licences de la plateforme d'administration : l'application utilise `SimulatedAdminApi`
  et une clé de démonstration publique ; à remplacer avant toute vente (spec 012, T061) ;
- hébergement du flux beta ;
- type de certificat (OV, EV ou Azure Trusted Signing) ;
- hébergement du flux de mises à jour ;
- contrat de géocodage commercial.
