import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const repositoryRoot = resolve(import.meta.dirname, '../../../..');
const importer = resolve(repositoryRoot, 'tools/migration/import-reference-data.mjs');

const fixtureSources: Record<string, unknown> = {
  'modules.json': [{
    id: 1, maker: 'Fixture Solar', code: 'FS-500', power: 500, vmp: 40, voc_stc: 49, imp_stc: 12, isc_stc: 12.5,
  }],
  'batteries.json': [{ id: 2, maker: 'Fixture Storage', code: 'FB-100', voltage: 48, capacity: 100, cycle_life: 'N/A' }],
  'inverters.json': [{ id: 3, maker: 'Fixture Power', code: 'FI-5K', nominal_power: 5_000, nominal_dc_voltage: 48 }],
  'localities.json': [{ id: 4, name: 'Lomé', country_code: 'TG', latitude: 6.1725, longitude: 1.2314 }],
  'weather-sources.json': [{ id: 5, locality_id: 4, provider: 'Fixture', source_name: 'TMY metadata' }],
  'profiles.json': { profiles: { default: { categories: { office: { display_name: 'Office', shape: Array.from({ length: 24 }, () => 1) } } } } },
};

function runImporter(sourceDirectory: string, outputDirectory: string): void {
  const executable = process.platform === 'win32' ? 'node.exe' : 'node';
  execFileSync(executable, [importer,
    '--modules', resolve(sourceDirectory, 'modules.json'),
    '--batteries', resolve(sourceDirectory, 'batteries.json'),
    '--inverters', resolve(sourceDirectory, 'inverters.json'),
    '--localities', resolve(sourceDirectory, 'localities.json'),
    '--weather-sources', resolve(sourceDirectory, 'weather-sources.json'),
    '--profiles', resolve(sourceDirectory, 'profiles.json'),
    '--out', outputDirectory,
  ], { cwd: repositoryRoot, stdio: 'pipe' });
}

function buildImportDependencies(): void {
  if (process.platform === 'win32') {
    execFileSync('cmd.exe', ['/d', '/s', '/c', 'pnpm --filter @ksd/catalog... build'], { cwd: repositoryRoot, stdio: 'pipe' });
    return;
  }
  execFileSync('pnpm', ['--filter', '@ksd/catalog...', 'build'], { cwd: repositoryRoot, stdio: 'pipe' });
}

describe('reference import CLI', () => {
  it('writes byte-identical artifacts for the same explicit sources', async () => {
    buildImportDependencies();
    const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'ksd-reference-import-'));
    const sourceDirectory = resolve(temporaryRoot, 'sources');
    const firstOutput = resolve(temporaryRoot, 'first');
    const secondOutput = resolve(temporaryRoot, 'second');
    try {
      await mkdir(sourceDirectory, { recursive: true });
      await Promise.all(Object.entries(fixtureSources).map(async ([filename, document]) => {
        await writeFile(resolve(sourceDirectory, filename), `${JSON.stringify(document)}\n`, 'utf8');
      }));
      runImporter(sourceDirectory, firstOutput);
      runImporter(sourceDirectory, secondOutput);
      const firstFiles = await readdir(firstOutput);
      const secondFiles = await readdir(secondOutput);
      expect(secondFiles.sort((left, right) => left.localeCompare(right))).toEqual(firstFiles.sort((left, right) => left.localeCompare(right)));
      for (const filename of firstFiles) {
        expect(await readFile(resolve(secondOutput, filename), 'utf8')).toBe(await readFile(resolve(firstOutput, filename), 'utf8'));
      }
    } finally {
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  }, 20_000);
});
