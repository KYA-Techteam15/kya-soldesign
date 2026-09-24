import sharp from 'sharp';
import { resolve } from 'node:path';

/**
 * Source carrée 1024 × 1024 des icônes de l'application, à partir du logo KYA
 * (720 × 559). Le logo est centré sur fond transparent, avec une marge de 6 %
 * pour que les petites tailles (16, 32 px) restent lisibles.
 *
 * Usage : node tools/assets/make-icon-source.mjs, puis `pnpm tauri icon`.
 */
const source = resolve('apps/desktop/public/kya-sol-design-logo.png');
const target = resolve('apps/desktop/src-tauri/icons/source.png');
const size = 1024;
const inner = Math.round(size * 0.88);

const logo = await sharp(source).resize({ width: inner, height: inner, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp({ create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: logo, gravity: 'center' }])
  .png()
  .toFile(target);
console.log(`icône source écrite : ${target}`);
