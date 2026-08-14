import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { localitySchema, weatherSourceSchema } from '@ksd/domain';
import { pvgisTmyJsonSchema, weatherFileManifestSchema } from '../../src/index.js';

const dataDirectory = resolve(import.meta.dirname, '../../data');

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(dataDirectory, relativePath), 'utf8'));
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('real weather file catalog', () => {
  it('accepts only weather sources backed by a verified local JSON file', async () => {
    const [sourceDocument, fileDocument] = await Promise.all([
      readJson('weather-sources.json') as Promise<{ schemaVersion: number; records: unknown[] }>,
      readJson('weather-files.json'),
    ]);
    const manifest = weatherFileManifestSchema.parse(fileDocument);
    const sources = sourceDocument.records.map((record) => weatherSourceSchema.parse(record));
    expect(sources).toHaveLength(manifest.records.length);
    expect(new Set(sources.map((source) => source.id)))
      .toEqual(new Set(manifest.records.map((record) => record.weatherSourceId)));

    for (const record of manifest.records) {
      const content = await readFile(resolve(dataDirectory, record.relativePath), 'utf8');
      expect(sha256(content)).toBe(record.sourceSha256);
      const tmy = pvgisTmyJsonSchema.parse(JSON.parse(content));
      expect(tmy.outputs.tmy_hourly).toHaveLength(8_760);
      expect(tmy.inputs.location.latitude).toBeCloseTo(record.latitudeDeg, 4);
      expect(tmy.inputs.location.longitude).toBeCloseTo(record.longitudeDeg, 4);
      expect(tmy.inputs.meteo_data.radiation_db).toBe(record.radiationDatabase);
      expect(tmy.inputs.meteo_data.year_min).toBe(record.yearMin);
      expect(tmy.inputs.meteo_data.year_max).toBe(record.yearMax);
      expect(tmy.outputs.tmy_hourly.every((row) => row['G(h)'] >= 0 && row['Gb(n)'] >= 0 && row['Gd(h)'] >= 0)).toBe(true);
    }
  });

  it('has a sourced timezone for each locality that owns an accepted weather file', async () => {
    const [localityDocument, fileDocument] = await Promise.all([
      readJson('localities.json') as Promise<{ schemaVersion: number; records: unknown[] }>,
      readJson('weather-files.json'),
    ]);
    const manifest = weatherFileManifestSchema.parse(fileDocument);
    const localities = localityDocument.records.map((record) => localitySchema.parse(record));
    for (const file of manifest.records) {
      const locality = localities.find((candidate) => candidate.id === file.localityId);
      expect(locality, file.localityId).toBeDefined();
      expect(locality?.timezone).toBe(file.timezoneIana);
    }
  });
});
