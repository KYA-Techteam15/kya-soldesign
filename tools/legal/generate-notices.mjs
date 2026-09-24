import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Mentions des composants tiers livrés avec l'application.
 *
 * - dépendances npm de production de l'application (`pnpm licenses list`) ;
 * - crates Rust de l'hôte Tauri (`cargo metadata`, champ `license`).
 * Écrit `apps/desktop/public/legal/THIRD_PARTY_NOTICES.txt` et copie LICENSE,
 * affichés dans « À propos » et embarqués dans l'installateur.
 *
 * Usage : node tools/legal/generate-notices.mjs
 */
const root = resolve('.');
const desktop = resolve(root, 'apps/desktop');
const output = resolve(desktop, 'public/legal');
mkdirSync(output, { recursive: true });

const run = (command, args, cwd) => execFileSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, shell: process.platform === 'win32' });

const npm = JSON.parse(run('pnpm', ['licenses', 'list', '--prod', '--json'], desktop));
const npmLines = Object.entries(npm)
  .flatMap(([license, packages]) => packages.map((pkg) => ({ name: pkg.name, versions: (pkg.versions ?? [pkg.version]).join(', '), license, author: typeof pkg.author === 'string' ? pkg.author : pkg.author?.name ?? '', homepage: pkg.homepage ?? '' })))
  .filter((entry) => !entry.name.startsWith('@ksd/'))
  .sort((left, right) => left.name.localeCompare(right.name));

const metadata = JSON.parse(run('cargo', ['metadata', '--format-version', '1', '--locked'], resolve(desktop, 'src-tauri')));
const crateLines = metadata.packages
  .filter((pkg) => pkg.name !== 'kya-soldesign')
  .map((pkg) => ({ name: pkg.name, versions: pkg.version, license: pkg.license ?? pkg.license_file ?? 'voir le dépôt', author: (pkg.authors ?? []).join(', '), homepage: pkg.repository ?? '' }))
  .sort((left, right) => left.name.localeCompare(right.name));

const section = (title, entries) => [
  title, '='.repeat(title.length), '',
  ...entries.map((entry) => `${entry.name} ${entry.versions} — ${entry.license}${entry.author ? ` — ${entry.author}` : ''}${entry.homepage ? `\n    ${entry.homepage}` : ''}`),
  '',
];

writeFileSync(resolve(output, 'THIRD_PARTY_NOTICES.txt'), [
  'KYA-SolDesign — Composants tiers / Third-party components',
  `Généré le ${new Date().toISOString().slice(0, 10)} / Generated on ${new Date().toISOString().slice(0, 10)}`,
  '',
  'Ces composants sont distribués sous leurs propres licences. Les textes complets',
  'figurent dans les dépôts de chaque composant. / These components are distributed',
  'under their own licenses; full texts are available in each project repository.',
  '',
  ...section(`Interface (npm) — ${npmLines.length} paquets`, npmLines),
  ...section(`Hôte de bureau (Rust) — ${crateLines.length} crates`, crateLines),
].join('\n'));
copyFileSync(resolve(root, 'LICENSE'), resolve(output, 'LICENSE.txt'));
console.log(`mentions écrites : ${npmLines.length} paquets npm, ${crateLines.length} crates Rust`);
