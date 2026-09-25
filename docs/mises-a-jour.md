# Mises à jour automatiques

Comment KYA-SolDesign se met à jour, où sont les clés, comment publier, que faire en cas de
problème. Mis en place le 2026-09-25 (spec 012, FR-E1).

## 1. Le principe

```text
 Développeur                    GitHub                               Poste client
 ───────────                    ──────                               ────────────
 étiquette v1.3.0  ──►  workflow « release »
                        ├─ construit l'installateur
                        ├─ le signe avec la CLÉ PRIVÉE  ─►  .exe + .exe.sig
                        └─ publie latest.json (version, notes, adresse, signature)
                                                                     au démarrage (1×/jour)
                        releases/latest/download/latest.json  ◄───  « y a-t-il plus récent ? »
                                                                     oui → boîte « Nouvelle version »
                        KYA-SolDesign_1.3.0_x64-setup.exe     ◄───  télécharge l'installateur
                                                                     vérifie la signature avec
                                                                     la CLÉ PUBLIQUE embarquée
                                                                     installe (mode passive), relance
```

- L'application interroge un fichier `latest.json` : la dernière version, ses notes et l'adresse de
  l'installateur, avec sa **signature**.
- Elle n'installe que ce qui est signé par **notre clé privée** : elle vérifie avec la clé publique
  compilée dans l'application. Un installateur modifié ou venu d'ailleurs est refusé.
- L'installation est en mode `passive` : barre de progression, aucune question, puis relance. Les
  projets, réglages et licence sont conservés.
- La vérification a lieu au démarrage, **au plus une fois par jour**, et seulement en ligne ; on peut
  aussi la lancer depuis **Aide → Rechercher une mise à jour** ou **Réglages → À propos**.

## 2. Les deux canaux

| Canal | Qui le reçoit | Adresse lue par l'application |
|---|---|---|
| **Stable** | tous les postes (par défaut) | `https://github.com/KYA-Techteam15/kya-soldesign/releases/latest/download/latest.json` |
| **Bêta** | postes réglés sur « Bêta » (Réglages → À propos) | `https://github.com/KYA-Techteam15/kya-soldesign/releases/download/updater-beta/latest.json` |

- « latest » ignore les brouillons et les préversions : une bêta n'atteint jamais le canal stable.
- Le workflow `updater-feeds` recopie le `latest.json` de **chaque** publication (bêta ou stable)
  dans la publication fixe `updater-beta` : un poste en bêta reçoit donc aussi les versions stables.
- Le choix du canal n'apparaît que dans une version compilée avec l'adresse bêta.

## 3. Où sont les clés

| Élément | Emplacement | Nature |
|---|---|---|
| Clé privée | `%USERPROFILE%\.kya-soldesign\updater\kya-soldesign-updater.key` | **secret** — chiffrée par le mot de passe |
| Mot de passe de la clé | `%USERPROFILE%\.kya-soldesign\updater\kya-soldesign-updater.password` | **secret** |
| Clé publique | `%USERPROFILE%\.kya-soldesign\updater\kya-soldesign-updater.key.pub` | public (identifiant `60F017B785D96C13`) |
| Les cinq valeurs réunies | `.env.release.local` à la racine du dépôt (**ignoré par git**) | secret |
| Pour la CI | GitHub → dépôt → Settings → *Secrets and variables* → Actions | secrets `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` ; variables `TAURI_UPDATER_PUBKEY`, `TAURI_UPDATER_ENDPOINT`, `TAURI_UPDATER_BETA_ENDPOINT` |

Les fichiers locaux ne sont lisibles que par le compte Windows qui les a créés.

**À faire par le responsable** : copier la clé privée et le mot de passe dans **deux** endroits sûrs
et séparés (coffre de l'entreprise — Infisical — et une sauvegarde hors ligne). GitHub ne rend jamais
un secret : il ne sert pas de sauvegarde.

### Si la clé est perdue

Les postes installés n'accepteront plus aucune mise à jour (ils ne connaissent que l'ancienne clé
publique). Il faut générer une nouvelle paire, publier une version, et la faire installer **à la
main** sur chaque poste. D'où les deux copies.

### Si la clé a fuité

Générer une nouvelle paire, mettre à jour les secrets et variables GitHub, publier une version
(installée à la main pour les postes qui doivent passer à la nouvelle clé), puis révoquer l'ancienne
dans tous les coffres.

Générer une paire : `pnpm --filter @ksd/desktop exec tauri signer generate -w <fichier.key>`.

## 4. Publier

1. Version et notes : `apps/desktop/package.json`, section `## X.Y.Z` de `CHANGELOG.md` (elle devient
   le texte de la boîte « Nouvelle version »), `releaseInfo.ts`.
2. `pnpm verify` vert.
3. Pousser l'étiquette sur la branche publiée :
   - `vX.Y.Z` → **stable** : publication créée **en brouillon** ; relire puis cliquer « Publish ».
     Les postes la voient dès la publication.
   - `vX.Y.Z-beta.N` → **bêta** : publiée tout de suite en préversion.

La **première** version construite avec ce mécanisme s'installe à la main (les versions antérieures
n'ont pas le module) ; les suivantes arrivent seules.

## 5. Installateur local avec mises à jour

`pnpm release:local` lit `.env.release.local` et produit, comme la CI, l'installateur et sa
signature dans `apps/desktop/src-tauri/target/release/bundle/nsis/`. Utile pour une version remise à
la main ; pour les mises à jour automatiques, c'est la publication GitHub qui compte.

## 6. Vérifier que tout marche

- Après publication : ouvrir `…/releases/latest/download/latest.json` dans un navigateur ; la version
  et la signature doivent y figurer.
- Sur un poste en version précédente : **Aide → Rechercher une mise à jour**.
- Diagnostic : **Aide → Copier les infos de diagnostic** (canal, version) ; journaux dans
  **Aide → Ouvrir le dossier des journaux**.

| Message | Cause probable |
|---|---|
| « Les mises à jour automatiques ne sont pas activées dans cette version » | version construite sans les variables (installateur local simple) |
| « Recherche impossible » | hors ligne, ou `latest.json` absent (publication encore en brouillon) |
| Signature refusée | installateur signé par une autre clé que celle compilée dans l'application |

## 7. Vers Infisical

Quand le projet Infisical de la plateforme existe :

1. importer `.env.release.local` (Infisical accepte un fichier `.env`) ;
2. relier GitHub Actions par OIDC (`Infisical/secrets-action`, identité machine limitée à ce dépôt) ;
3. ajouter l'étape de lecture dans `release.yml` avant la construction — les noms restent les mêmes ;
4. supprimer les deux secrets GitHub.
