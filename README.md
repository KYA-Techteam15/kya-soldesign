# KYA-SolDesign

Logiciel de bureau de dimensionnement d'installations solaires photovoltaïques,
édité par KYA-Energy Group. Il accompagne l'ingénieur du site et des besoins
jusqu'au dossier client : prédimensionnement, dimensionnement avec le matériel du
catalogue, protections et câbles, chiffrage, schéma unifilaire et documents Word.

La version 1.2 couvre le système autonome à onduleur tout-en-un (AIO). Les autres
architectures sont annoncées dans l'application et suivies dans `ROADMAP.md`.

Le logiciel s'utilise sous **licence** : Commerciale, Académique ou Étudiant, pour une durée
donnée. L'édition active, les fonctions qu'elle ouvre et le temps restant se lisent dans la
barre d'état et dans **Réglages → Licence**.

Au premier lancement, l'accueil propose de renseigner la société, d'ouvrir le
**projet exemple** (un centre de santé à Bombouaka, calculé à l'ouverture) ou de
créer un projet. Un dossier terminé s'**émet** à l'étape 8 : la version est figée,
datée et numérotée, le dossier passe en lecture seule et ses documents restent
réimprimables à l'identique ; « Créer une révision » ouvre la version suivante.

## Pour les utilisateurs

Installez `KYA-SolDesign_x.y.z_x64-setup.exe` (Windows 10 ou 11, 64 bits). L'installateur
embarque WebView2 : aucune connexion n'est nécessaire pour installer ni pour
travailler. Internet ne sert qu'aux téléchargements météo PVGIS et à la recherche
de villes.

- Projets : enregistrés sur le poste (SQLite), copie de sauvegarde à chaque démarrage.
- Sauvegarde complète et restauration : **Réglages → Données**.
- Mises à jour, journaux, infos de diagnostic, textes légaux : **Réglages → À propos**
  (et menu **Aide**).
- Avis, signalement d'un problème, réponses de l'équipe, statistiques anonymes :
  **Réglages → Avis et assistance**.
- Un fichier `.ksd` s'ouvre par double clic ou par **Fichier → Ouvrir un projet** (Ctrl+O).

## Pour les développeurs

Prérequis : Node.js ≥ 22.14, pnpm 11 (`corepack enable`), et pour l'application de
bureau Rust stable (MSVC) avec les outils C++ de Visual Studio.

```powershell
pnpm install --frozen-lockfile
pnpm dev                                    # interface seule, navigateur, proxy météo Vite
pnpm --filter @ksd/desktop exec tauri dev   # application de bureau
pnpm verify:phase                           # lint, types, contrôles d'interface, tests rapides
pnpm verify                                 # porte complète (golden, intégration, couverture, build, E2E)
```

Installateur local : `pnpm --filter @ksd/desktop exec tauri build`
(sortie : `apps/desktop/src-tauri/target/release/bundle/nsis/`).

### Organisation

| Dossier | Rôle |
|---|---|
| `packages/engine` | calculs purs (prédimensionnement, bilan horaire, dimensionnement, protections IEC, finance) |
| `packages/domain`, `packages/project-format` | contrats validés à l'exécution, format de projet versionné |
| `packages/catalog` | catalogue matériel, localités et météo embarqués |
| `packages/diagram` | schéma unifilaire SVG déterministe |
| `apps/desktop/src` | interface React ; `app/platform` isole tout ce qui dépend de l'hôte |
| `apps/desktop/src-tauri` | hôte Tauri 2 (plugins, capacités, installateur) |
| `specs/` | spécifications ; `specs/010-release-readiness` décrit la version 1.0, `specs/011-ux-refonte` la 1.1 |
| `tools/` | contrôles d'interface, mentions légales, conversion d'images, publication |

Règles non négociables : `AGENTS.md` et `.specify/memory/constitution.md`. Aucun
résultat affiché ne provient d'une valeur d'exemple ou d'un repli implicite.

Publication : voir `RELEASING.md`.
