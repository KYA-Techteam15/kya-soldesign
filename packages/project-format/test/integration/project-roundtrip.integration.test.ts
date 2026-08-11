import { describe, expect, it } from 'vitest';
import { parseProjectFile } from '../../src/index.js';

describe('project file v1', () => {
  it('round-trips without implicit fields', () => {
    const source = {
      schemaVersion: 1 as const,
      id: 'ddeb27fb-d9a0-4624-be4d-4615062daed4',
      name: 'Reference project',
      system: 'standalone-all-in-one' as const,
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
      inputs: {},
      selectedEquipmentIds: [],
      lastCalculation: null,
    };
    expect(parseProjectFile(JSON.parse(JSON.stringify(source)))).toEqual(source);
  });

  it('rejects future schemas until a migration exists', () => {
    expect(() => parseProjectFile({ schemaVersion: 2 })).toThrow();
  });
});

