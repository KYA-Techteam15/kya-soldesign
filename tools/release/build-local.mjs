import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Installateur local avec mises à jour, sans passer par GitHub Actions.
 *
 * Lit `.env.release.local` (ignoré par git : clés de signature et adresses des flux), assemble la
 * configuration de publication comme le fait la CI, puis construit l'installateur signé pour le
 * module de mise à jour. Les secrets ne sont jamais affichés.
 *
 *   pnpm release:local
 */
const envFile = resolve('.env.release.local');
if (!existsSync(envFile)) {
  console.error('.env.release.local introuvable : voir RELEASING.md, « Mises à jour ».');
  process.exit(1);
}

const env = { ...process.env };
for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/u)) {
  const match = /^([A-Z0-9_]+)=(.*)$/u.exec(line.trim());
  if (match) env[match[1]] = match[2];
}
// Le flux bêta est lu par l'hôte à la compilation.
env.KSD_UPDATER_BETA_ENDPOINT = env.TAURI_UPDATER_BETA_ENDPOINT ?? '';
env.VITE_RELEASE_CHANNEL ??= 'stable';

const missing = ['TAURI_SIGNING_PRIVATE_KEY', 'TAURI_SIGNING_PRIVATE_KEY_PASSWORD', 'TAURI_UPDATER_PUBKEY', 'TAURI_UPDATER_ENDPOINT'].filter((name) => !env[name]);
if (missing.length > 0) {
  console.error(`Valeurs manquantes dans .env.release.local : ${missing.join(', ')}`);
  process.exit(1);
}

const shell = process.platform === 'win32';
const args = execFileSync('node', ['tools/release/prepare-config.mjs'], { env, encoding: 'utf8' }).trim().split(/\s+/u).filter(Boolean);
console.log(`tauri build ${args.join(' ')}`);
execFileSync('pnpm', ['--filter', '@ksd/desktop', 'exec', 'tauri', 'build', ...args], { env, stdio: 'inherit', shell });
