import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const frBlock = await readFile(resolve('apps/desktop/src/shared/i18n/fr.ts'), 'utf8');
const enBlock = await readFile(resolve('apps/desktop/src/shared/i18n/en.ts'), 'utf8');
const keys = (value) => [...value.matchAll(/'([^']+)':/g)].map((match) => match[1]).sort((left, right) => left.localeCompare(right));
const frKeys = keys(frBlock); const enKeys = keys(enBlock);
if (frKeys.length === 0 || JSON.stringify(frKeys) !== JSON.stringify(enKeys)) throw new Error('French and English message keys must match exactly');
if (/\{\{[^}]+\}\}/.test(`${frBlock}\n${enBlock}`)) throw new Error('Unresolved raw translation token found');
process.stdout.write(`i18n check passed (${frKeys.length} keys)\n`);
