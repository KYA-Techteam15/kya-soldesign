import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

/**
 * Garde-fou du dictionnaire.
 *
 * Il vise `src/i18n/index.ts`, le seul dictionnaire que l'application charge.
 * Il a longtemps visé `src/shared/i18n/`, qui appartenait à un arbre
 * d'interface que rien n'exécutait : le contrôle passait au vert sans rien
 * dire des 700 clés réellement rendues à l'écran.
 */

const dictionaryPath = resolve('apps/desktop/src/i18n/index.ts');
const sourceRoot = resolve('apps/desktop/src');

const source = await readFile(dictionaryPath, 'utf8');

// Chaque entrée s'écrit `'clé': { fr: '…', en: '…' }`. On lit la paire d'un
// bloc plutôt que chaque champ isolément : c'est l'appariement fr/en qui doit
// être garanti, pas la simple présence des deux mots.
const entryPattern = /'([^']+)':\s*\{\s*fr:\s*(['"`])((?:\\.|(?!\2)[\s\S])*)\2,\s*en:\s*(['"`])((?:\\.|(?!\4)[\s\S])*)\4,?\s*\}/g;
const entries = [...source.matchAll(entryPattern)].map((match) => ({
  key: match[1],
  fr: match[3],
  en: match[5],
}));

const failures = [];

if (entries.length === 0) failures.push('Aucune entrée de traduction lisible dans i18n/index.ts');

const declaredKeys = [...source.matchAll(/^ {2}'([^']+)':\s*\{/gmu)].map((match) => match[1]);
const unpaired = declaredKeys.filter((key) => !entries.some((entry) => entry.key === key));
for (const key of unpaired) failures.push(`« ${key} » n'expose pas exactement une valeur fr et une valeur en`);

const seen = new Set();
for (const entry of entries) {
  if (seen.has(entry.key)) failures.push(`« ${entry.key} » est déclarée deux fois`);
  seen.add(entry.key);
  if (entry.fr.trim().length === 0) failures.push(`« ${entry.key} » n'a pas de texte français`);
  if (entry.en.trim().length === 0) failures.push(`« ${entry.key} » n'a pas de texte anglais`);
}

if (/\{\{[^}]+\}\}/u.test(source)) failures.push('Jeton de traduction non résolu ({{…}}) dans le dictionnaire');

// Une clé demandée mais absente s'affiche telle quelle à l'écran. On relit
// donc les appels `t('…')` du code livré et on exige qu'ils existent.
async function filesUnder(directory) {
  const found = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(found.map(async (entry) => {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(target);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
}

const used = new Map();
for (const file of await filesUnder(sourceRoot)) {
  const text = await readFile(file, 'utf8');
  for (const match of text.matchAll(/\bt\(\s*'([a-zA-Z0-9_.-]+)'\s*\)/gu)) {
    if (!used.has(match[1])) used.set(match[1], relative(sourceRoot, file).split('\\').join('/'));
  }
}

for (const [key, file] of used) {
  if (!seen.has(key)) failures.push(`« ${key} » est demandée par ${file} mais absente du dictionnaire`);
}

// Les jetons de gabarit ({n}, {date}…) doivent être les mêmes dans les deux langues : un jeton
// oublié s'afficherait tel quel, ou une valeur manquerait dans une seule langue.
const tokens = (text) => [...text.matchAll(/\{[a-zA-Z]+\}/gu)].map((match) => match[0]).sort((left, right) => left.localeCompare(right)).join(',');
for (const entry of entries) {
  if (tokens(entry.fr) !== tokens(entry.en)) failures.push(`« ${entry.key} » n'a pas les mêmes jetons en français (${tokens(entry.fr) || '—'}) et en anglais (${tokens(entry.en) || '—'})`);
}

// Une clé que plus rien ne demande est un texte mort (spec 011, P-1) : elle ment sur ce que
// l'écran affiche et se traduit pour rien. Une clé compte comme demandée si elle apparaît en
// littéral dans le code livré (application ou paquets), ou si un préfixe construit la couvre
// (« t(`home.status.${état}`) »).
let shipped = '';
const packageSources = (await readdir(resolve('packages'), { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => resolve('packages', entry.name, 'src'));
for (const directory of [sourceRoot, ...packageSources]) {
  let found = [];
  try { found = await filesUnder(directory); } catch { continue; }
  for (const file of found) if (file !== dictionaryPath) shipped += `${await readFile(file, 'utf8')}\n`;
}
const literals = new Set([...shipped.matchAll(/['"`]([a-zA-Z0-9_]+(?:[.-][a-zA-Z0-9_]+)+)['"`]/gu)].map((match) => match[1]));
const prefixes = [...new Set([...shipped.matchAll(/['"`]([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_-]+)*\.)(?:\$\{|['"`]\s*\+)/gu)].map((match) => match[1]))];
for (const entry of entries) {
  if (!literals.has(entry.key) && !prefixes.some((prefix) => entry.key.startsWith(prefix))) failures.push(`« ${entry.key} » n'est plus demandée par aucun écran`);
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`i18n check passed (${entries.length} clés, ${used.size} utilisées)`);
}
