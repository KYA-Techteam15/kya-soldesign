import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Notes d'une version, tirées de CHANGELOG.md : la section « ## X.Y.Z — date » jusqu'à la suivante.
 * Elles deviennent le corps de la publication GitHub, que l'application affiche dans la boîte
 * « Nouvelle version » (spec 012, FR-E1).
 *
 *   node tools/release/changelog-section.mjs v1.2.0
 */
const tag = process.argv[2] ?? '';
const version = tag.replace(/^v/u, '').replace(/-.*$/u, '');
const lines = readFileSync(resolve('CHANGELOG.md'), 'utf8').split(/\r?\n/u);
const start = lines.findIndex((line) => line.startsWith(`## ${version} `) || line === `## ${version}`);
if (start < 0) {
  console.log(`KYA-SolDesign ${tag}.`);
} else {
  const end = lines.findIndex((line, index) => index > start && line.startsWith('## '));
  console.log(lines.slice(start + 1, end < 0 ? undefined : end).join('\n').trim());
}
