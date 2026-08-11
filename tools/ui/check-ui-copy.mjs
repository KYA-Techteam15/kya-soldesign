import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve('apps/desktop/src');
const allowed = new Set(['KYA', 'SolDesign', 'Ctrl K', 'KYA SOLAR ENGINEERING', 'Français', 'English']);

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]));
  return nested.flat();
}

const failures = [];
for (const file of await files(root)) {
  if (extname(file) !== '.tsx') continue;
  const source = await readFile(file, 'utf8');
  for (const match of source.matchAll(/>([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 .…·–—-]*)</g)) {
    const value = match[1]?.trim();
    if (value && !allowed.has(value) && !/^[\d\s/←→·.–—…]+$/.test(value)) failures.push(`${relative(root, file)}: ${value}`);
  }
}

if (failures.length) throw new Error(`Hard-coded user-facing copy found:\n${failures.join('\n')}`);
process.stdout.write('UI copy check passed\n');
