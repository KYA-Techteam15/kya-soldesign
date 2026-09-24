import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Configuration de publication, assemblée à partir de l'environnement.
 *
 * Les décisions commerciales (certificat, hébergement des mises à jour) ne sont
 * pas figées dans le dépôt : chaque capacité s'active quand ses secrets existent.
 *
 * - WINDOWS_CERTIFICATE_THUMBPRINT : empreinte du certificat Authenticode importé
 *   sur l'agent → l'exécutable et l'installateur sont signés.
 * - TAURI_UPDATER_ENDPOINT + TAURI_UPDATER_PUBKEY (+ TAURI_SIGNING_PRIVATE_KEY lu
 *   par la CLI) → module de mise à jour compilé et artefacts de mise à jour produits.
 *
 * Écrit `apps/desktop/src-tauri/tauri.release.conf.json` et affiche les
 * arguments à passer à `tauri build`.
 */
const config = {};
const args = [];

const thumbprint = process.env.WINDOWS_CERTIFICATE_THUMBPRINT?.trim();
if (thumbprint) {
  config.bundle = { ...config.bundle, windows: { certificateThumbprint: thumbprint, digestAlgorithm: 'sha256', timestampUrl: process.env.WINDOWS_TIMESTAMP_URL?.trim() || 'http://timestamp.digicert.com' } };
}

const endpoint = process.env.TAURI_UPDATER_ENDPOINT?.trim();
const pubkey = process.env.TAURI_UPDATER_PUBKEY?.trim();
if (endpoint && pubkey) {
  config.bundle = { ...config.bundle, createUpdaterArtifacts: true };
  config.plugins = { updater: { endpoints: [endpoint], pubkey, windows: { installMode: 'passive' } } };
  args.push('--features', 'updater');
}

if (Object.keys(config).length > 0) {
  const target = resolve('apps/desktop/src-tauri/tauri.release.conf.json');
  writeFileSync(target, JSON.stringify(config, null, 2));
  args.push('--config', 'src-tauri/tauri.release.conf.json');
}

console.log(args.join(' '));
