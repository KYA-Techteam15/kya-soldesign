import { readdir, stat, unlink } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import sharp from 'sharp';

/**
 * Convertit les illustrations PNG de l'interface en WebP.
 *
 * Usage : node tools/assets/convert-webp.mjs <dossier> [largeur-max]
 * Les schémas d'architecture s'affichent au plus à ~460 px de large (×2 pour
 * les écrans haute densité) : au-delà, chaque pixel n'est que du poids.
 */
const directory = resolve(process.argv[2] ?? 'apps/desktop/src/assets/systems');
const maxWidth = Number(process.argv[3] ?? 960);

for (const name of await readdir(directory)) {
  if (extname(name) !== '.png') continue;
  const source = join(directory, name);
  const target = source.replace(/\.png$/u, '.webp');
  await sharp(source).resize({ width: maxWidth, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(target);
  const [before, after] = await Promise.all([stat(source), stat(target)]);
  console.log(`${name}: ${Math.round(before.size / 1024)} Ko → ${Math.round(after.size / 1024)} Ko`);
  await unlink(source);
}
