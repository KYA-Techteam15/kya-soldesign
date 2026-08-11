import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceExtensions = new Set(['.ts', '.tsx', '.css']);
const forbidden = [
  ['PARENT_RUNTIME', /(?:\.\.\/)+(?:design-proposition|kyasoldesign|ksd_app)/],
  ['PROTOTYPE_ENGINE', /\b(?:MockEngine|SizingEngine|ENGINE_IS_SIMULATED)\b/],
  ['PROTOTYPE_FIXTURE', /from\s+['"][^'"]*(?:fixtures|test\/support|e2e\/fixtures)[^'"]*['"]/],
  ['PROTOTYPE_STORAGE', /\b(?:ksd-ui|ksd-projects)\b/],
];

export function scanText(text, filePath) {
  const issues = [];
  for (const [code, expression] of forbidden) {
    if (expression.test(text)) issues.push({ code, filePath });
  }
  const directJsonImport = /from\s+['"][^'"]+\.json['"]/.test(text);
  if (directJsonImport && !filePath.replaceAll('\\', '/').includes('app/adapters/')) {
    issues.push({ code: 'DIRECT_JSON_UI_IMPORT', filePath });
  }
  return issues;
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = resolve(directory, entry.name);
    if (entry.isDirectory()) return filesUnder(target);
    return sourceExtensions.has(extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
}

export async function scanDirectory(directory) {
  const files = await filesUnder(directory);
  const findings = await Promise.all(files.map(async (file) => scanText(await readFile(file, 'utf8'), relative(directory, file))));
  return findings.flat();
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const root = resolve(fileURLToPath(new URL('../../apps/desktop/src', import.meta.url)));
  const findings = await scanDirectory(root);
  if (findings.length > 0) {
    console.error(JSON.stringify(findings, null, 2));
    process.exitCode = 1;
  } else {
    console.log('production boundary scan passed');
  }
}
