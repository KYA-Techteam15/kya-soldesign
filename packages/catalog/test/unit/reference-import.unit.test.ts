import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  canonicalIdentity,
  importLegacyLoadProfiles,
  importReferenceBatteries,
  importReferenceInverters,
  importReferencePvModules,
  importReportSchema,
  parseLegacyScalar,
  type ImportContext,
} from '../../src/index.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const context: ImportContext = { transformationVersion: '1.0.0', sha256 };
const source = (records: readonly unknown[]) => ({
  sourceId: 'reference-fixture',
  sourceSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  records,
});

describe('reference imports', () => {
  it('quarantines a module whose required electrical fact is missing', () => {
    const result = importReferencePvModules(source([{
      id: 1,
      maker: 'Example',
      code: 'M-1',
      power: 500,
      vmp: 40,
      voc_stc: 50,
      imp_stc: 12,
    }]), context);
    expect(result.accepted).toHaveLength(0);
    expect(result.quarantined).toHaveLength(1);
    expect(result.quarantined[0]?.issues.map((issue) => issue.code)).toContain('SOURCE_FIELD_REQUIRED');
  });

  it('preserves unknown battery cycle life instead of creating a numeric default', () => {
    const result = importReferenceBatteries(source([{
      id: 2,
      maker: 'Example',
      code: 'B-1',
      voltage: '48',
      capacity: '100',
      max_dod: 80,
      round_trip_efficiency: 90,
      cycle_life: 'N/A',
      technology: 'Lithium',
    }]), context);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toMatchObject({
      kind: 'battery',
      nominalEnergyWh: 4_800,
      cycleLife: null,
      usableDepthOfDischargeRatio: 0.8,
      roundTripEfficiencyRatio: 0.9,
    });
  });

  it('normalizes the legacy profile shape exactly once', () => {
    const result = importLegacyLoadProfiles({
      sourceId: 'legacy-profiles',
      sourceSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      document: {
        profiles: {
          default: {
            categories: {
              office: {
                display_name: 'Office',
                shape: Array.from({ length: 24 }, () => 0.5),
              },
            },
          },
        },
      },
    }, context);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]?.hourlyEnergyFractions.reduce((total, fraction) => total + fraction, 0)).toBeCloseTo(1, 12);
  });

  it('uses normalized identity text and explicit decimal parsing', () => {
    expect(canonicalIdentity(['pv-module', '  ÉNERGIE  ', ' Model\tX ']))
      .toBe(canonicalIdentity(['pv-module', 'energie', 'model x']));
    expect(parseLegacyScalar('12,5')).toEqual({ state: 'parsed', value: 12.5 });
    expect(parseLegacyScalar('N/A')).toEqual({ state: 'missing', value: null });
    expect(parseLegacyScalar('12 kW')).toEqual({ state: 'invalid', value: null });
  });

  it('reports duplicate identities separately from conflicting technical values', () => {
    const result = importReferenceInverters(source([
      { id: 1, maker: 'Example', code: 'I-1', nominal_power: 5_000, nominal_dc_voltage: 48 },
      { id: 2, maker: ' Example ', code: 'I-1', nominal_power: 6_000, nominal_dc_voltage: 48 },
    ]), context);
    expect(result.report.duplicateCanonicalIdentities).toEqual(['inverter|example|i-1']);
    expect(result.report.conflicts).toHaveLength(1);
    expect(importReportSchema.parse(result.report)).toEqual(result.report);
  });
});
