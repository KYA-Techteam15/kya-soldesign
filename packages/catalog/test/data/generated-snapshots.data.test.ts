import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  localitySchema,
  normalizedHourlyProfileSchema,
  weatherSourceSchema,
} from '@ksd/domain';
import {
  equipmentSchema,
  importReportSchema,
  quarantinedRecordSchema,
  validateEquipment,
} from '../../src/index.js';

const dataDirectory = resolve(import.meta.dirname, '../../data');

async function readJson(filename: string): Promise<unknown> {
  return JSON.parse(await readFile(resolve(dataDirectory, filename), 'utf8'));
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

describe('generated canonical snapshots', () => {
  it('parses every accepted record and preserves the report accounting', async () => {
    const [equipmentDocument, localityDocument, weatherDocument, profileDocument, quarantineDocument, qualityDocument] = await Promise.all([
      readJson('equipment.json'),
      readJson('localities.json'),
      readJson('weather-sources.json'),
      readJson('load-profiles.json'),
      readJson('quarantine.json'),
      readJson('quality-report.json'),
    ]);
    const equipment = equipmentDocument as { schemaVersion: number; records: unknown[] };
    const localities = localityDocument as { schemaVersion: number; records: unknown[] };
    const weatherSources = weatherDocument as { schemaVersion: number; records: unknown[] };
    const profiles = profileDocument as { schemaVersion: number; records: unknown[] };
    const quarantined = quarantineDocument as { schemaVersion: number; records: unknown[] };
    const quality = qualityDocument as {
      schemaVersion: number;
      totals: { inputRecords: number; acceptedRecords: number; quarantinedRecords: number };
      reports: Record<string, { inputRecordCount: number; acceptedRecordCount: number; quarantinedRecordCount: number }>;
    };

    expect([equipment, localities, weatherSources, profiles, quarantined, quality].every((document) => document.schemaVersion === 1)).toBe(true);
    const acceptedEquipment = equipment.records.map((record) => equipmentSchema.parse(record));
    for (const record of acceptedEquipment) {
      expect(validateEquipment(record).issues.some((issue) => issue.severity === 'error')).toBe(false);
    }
    localities.records.forEach((record) => localitySchema.parse(record));
    weatherSources.records.forEach((record) => weatherSourceSchema.parse(record));
    profiles.records.forEach((record) => normalizedHourlyProfileSchema.parse(record));
    quarantined.records.forEach((record) => {
      const { dataset, ...quarantine } = record as { dataset: string; [key: string]: unknown };
      expect(dataset).toBeTypeOf('string');
      quarantinedRecordSchema.parse(quarantine);
    });
    Object.values(quality.reports).forEach((report) => importReportSchema.parse(report));

    const reports = Object.values(quality.reports);
    expect(quality.totals.inputRecords).toBe(reports.reduce((total, report) => total + report.inputRecordCount, 0));
    expect(quality.totals.acceptedRecords).toBe(reports.reduce((total, report) => total + report.acceptedRecordCount, 0));
    expect(quality.totals.quarantinedRecords).toBe(reports.reduce((total, report) => total + report.quarantinedRecordCount, 0));
    expect(quarantined.records).toHaveLength(quality.totals.quarantinedRecords);
    expect(equipment.records.length + localities.records.length + weatherSources.records.length + profiles.records.length)
      .toBe(quality.totals.acceptedRecords);
    expect(new Set(equipment.records.map((record) => equipmentSchema.parse(record).id)).size).toBe(equipment.records.length);
    const localityIds = new Set(localities.records.map((record) => localitySchema.parse(record).id));
    expect(localityIds.size).toBe(localities.records.length);
    expect(weatherSources.records.every((record) => localityIds.has(weatherSourceSchema.parse(record).localityId))).toBe(true);
  });

  it('matches every manifest artifact digest', async () => {
    const manifest = await readJson('manifest.json') as {
      schemaVersion: number;
      artifacts: { filename: string; sha256: string }[];
      sources: { sourceId: string; sourceSha256: string }[];
    };
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.sources).toHaveLength(6);
    for (const artifact of manifest.artifacts) {
      const content = await readFile(resolve(dataDirectory, artifact.filename), 'utf8');
      expect(sha256(content)).toBe(artifact.sha256);
    }
  });

  it('contains no parent-relative path or local source path in production snapshots', async () => {
    const filenames = ['equipment.json', 'localities.json', 'weather-sources.json', 'weather-files.json', 'load-profiles.json', 'quarantine.json', 'quality-report.json', 'manifest.json'];
    for (const filename of filenames) {
      const content = await readFile(resolve(dataDirectory, filename), 'utf8');
      expect(content).not.toMatch(/(?:\.\.\\|\.\.\/|[A-Za-z]:\\)/u);
    }
  });
});
