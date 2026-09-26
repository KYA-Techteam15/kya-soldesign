# Publier une version

## 1. Préparer

1. Mettre à jour la version dans `apps/desktop/package.json` (l'hôte Tauri la lit).
2. Compléter `CHANGELOG.md` et `apps/desktop/src/app/models/releaseInfo.ts`.
3. `pnpm verify` doit être vert.
4. Revue humaine de `specs/010-release-readiness/checklists/requirements.md`.

## 2. Publier

- **Version stable** : pousser une étiquette `vX.Y.Z`. Le workflow `release` construit
  l'installateur NSIS et crée une publication GitHub **en brouillon**, à relire. Les postes ne
  voient la mise à jour qu'une fois le brouillon **publié**.
- **Version bêta** : pousser une étiquette `vX.Y.Z-beta.N`. La publication part aussitôt en
  préversion ; seuls les postes réglés sur le canal bêta la reçoivent.
- Les notes de la publication — celles de la boîte « Nouvelle version » — sont la section de la
  version dans `CHANGELOG.md` (`tools/release/changelog-section.mjs`).

## 3. Capacités activées par secrets

Aucune de ces décisions n'est figée dans le code. Sans le secret correspondant,
la version est construite sans la capacité, et l'application l'indique.

| Capacité | Secrets / variables du dépôt | Effet |
|---|---|---|
| Signature Authenticode | `WINDOWS_CERTIFICATE` (PFX en base64), `WINDOWS_CERTIFICATE_PASSWORD` | exécutable et installateur signés ; plus d'alerte SmartScreen « éditeur inconnu » |
| Mises à jour automatiques | variables `TAURI_UPDATER_ENDPOINT`, `TAURI_UPDATER_PUBKEY` ; secrets `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | module de mise à jour compilé, `latest.json` publié |
| Géocodage commercial | secret `OPEN_METEO_API_KEY` | appels Open-Meteo sur le domaine commercial (usage commercial soumis à abonnement) |

### Mises à jour : état au 2026-09-25

Guide complet (fonctionnement, clés, publication, perte de clé, dépannage) :
[`docs/mises-a-jour.md`](docs/mises-a-jour.md).

**Configurées.** Les variables et secrets ci-dessus sont posés sur le dépôt ; la paire de clés a
été générée le 2026-09-25 (identifiant de clé publique `60F017B785D96C13`).

| Où | Quoi |
|---|---|
| `%USERPROFILE%\.kya-soldesign\updater\` | `kya-soldesign-updater.key` (privée, chiffrée), `.key.pub`, `.password` |
| `.env.release.local` (racine du dépôt, **ignoré par git**) | les cinq valeurs, prêtes à importer dans un coffre |
| GitHub → Settings → Secrets | `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` |
| GitHub → Settings → Variables | `TAURI_UPDATER_PUBKEY`, `TAURI_UPDATER_ENDPOINT`, `TAURI_UPDATER_BETA_ENDPOINT` |

La clé privée et son mot de passe se gardent **en deux endroits sûrs** (coffre de l'entreprise et
sauvegarde hors ligne) : perdus, plus aucune mise à jour n'atteint les postes installés, qu'il
faudrait réinstaller à la main avec une nouvelle clé.

**Vers Infisical.** Quand le projet Infisical de la plateforme existe : importer
`.env.release.local` (Infisical accepte l'import d'un `.env`), relier GitHub Actions par OIDC
(`Infisical/secrets-action`, identité machine limitée à ce dépôt), puis retirer les deux secrets
GitHub. Le workflow n'a qu'une étape à ajouter avant la construction ; les noms de variables
restent les mêmes.

### Canaux de mise à jour (spec 012, FR-E1)

- **stable** : `TAURI_UPDATER_ENDPOINT` =
  `https://github.com/KYA-Techteam15/kya-soldesign/releases/latest/download/latest.json`.
  « latest » ignore brouillons et préversions : une bêta ne part jamais vers le canal stable.
- **bêta** : `TAURI_UPDATER_BETA_ENDPOINT` =
  `https://github.com/KYA-Techteam15/kya-soldesign/releases/download/updater-beta/latest.json`,
  compilée dans l'hôte. Le workflow `updater-feeds` y recopie le `latest.json` de chaque
  publication (bêta ou stable) : un poste en bêta reçoit les deux.
- La **première** version compilée avec le module de mise à jour s'installe à la main ; les
  suivantes arrivent seules. L'installateur construit en local sans ces variables n'a pas le module.
- **Installateur local avec mises à jour** : `pnpm release:local` lit `.env.release.local` et
  produit, comme la CI, l'installateur et sa signature (`.exe.sig`).

L'installation se fait en mode `passive` : barre de progression, sans question, puis relance.
À chaque démarrage (en ligne), l'application vérifie et annonce une version disponible
dans une boîte avec ses notes (le corps de la publication).

## 4. Installateur

- Images : `apps/desktop/src-tauri/installer/{header,sidebar}.bmp`, générées par
  `pwsh tools/release/installer-art.ps1` à partir du logo.
- Désinstallation : la case « Supprimer les données de l'application » (décochée par défaut)
  efface `%APPDATA%` et `%LOCALAPPDATA%` de l'application — projets, sauvegardes, journaux,
  licence. Décochée, tout est conservé pour une réinstallation. Une mise à jour ne supprime rien.

## 5. Décisions encore ouvertes

- Plateforme des licences (T061 fait) : `HttpAdminApi` contre KYA-EnergyMarket. La construction
  vise `dev` par défaut ; à la mise en production de la plateforme (sa spécification 011), fixer
  l'adresse de production dans `apps/desktop/src/app/licensing/platform.ts`, l'autoriser dans
  `src-tauri/capabilities/default.json`, et construire les versions publiées avec
  `VITE_PLATFORM_ENV=production`. Ne publier aucune version vendue avant ;
- type de certificat (OV, EV ou Azure Trusted Signing) ;
- hébergement du flux de mises à jour ;
- contrat de géocodage commercial.
