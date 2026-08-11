import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  importLegacyLoadProfiles,
  importReferenceBatteries,
  importReferenceInverters,
  importReferenceLocalities,
  importReferencePvModules,
  importReferenceWeatherSources,
  parseLegacyScalar,
  type ImportContext,
} from '../../src/index.js';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const context: ImportContext = { transformationVersion: '1.0.0', sha256 };
const digest = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const source = (sourceId: string, records: readonly unknown[]) => ({ sourceId, sourceSha256: digest, records });

describe('reference importer boundary coverage', () => {
  it('maps complete reference equipment and exposes non-fatal source warnings', () => {
    const modules = importReferencePvModules(source('modules', [{
      id: 'm1', maker: ' Solar ', code: 'M1', power: '500', vmp: '40', voc_stc: 50, imp_stc: 10, isc_stc: 11,
      module_type: 'mono', area: '2.1', coef_temp_pmp: '-0.4', coef_temp_voc: '-0.3', tnoct: 45,
    }, {
      id: 'm2', maker: 'Solar', code: 'M2', power: 500, vmp: 51, voc_stc: 50, imp_stc: 12, isc_stc: 11,
    }]), context);
    const batteries = importReferenceBatteries(source('batteries', [{
      id: 'b1', maker: 'Storage', code: 'B1', voltage: 48, capacity: 100, max_dod: 80,
      round_trip_efficiency: 90, cycle_life: 4_000, technology: 'lithium',
    }, {
      id: 'b2', maker: 'Storage', code: 'B2', voltage: 48, capacity: 100, max_dod: 120,
      round_trip_efficiency: 'not-a-number', cycle_life: 0,
    }]), context);
    const inverters = importReferenceInverters(source('inverters', [{
      id: 'i1', maker: 'Power', code: 'I1', nominal_power: 5_000, nominal_dc_voltage: 48,
      overload_power: 6_000, nominal_ac_voltage: 230, efficiency: 95, pv_array_max_power: 6_500,
      mppt_min_voltage: 120, mppt_max_voltage: 450, pv_open_circuit_max_voltage: 500,
      pv_inputs_number: 2, max_charging_current: 80, max_parallel_units: 2, can_be_in_parallel: 1, inverter_type: 'hybrid',
    }, {
      id: 'i2', maker: 'Power', code: 'I2', nominal_power: 5_000, nominal_dc_voltage: 48,
      overload_power: 5_000, pv_inputs_number: 0, max_parallel_units: 0, can_be_in_parallel: 'yes', efficiency: -5,
    }]), context);

    expect(modules.accepted).toHaveLength(1);
    expect(modules.quarantined).toHaveLength(1);
    expect(batteries.accepted).toHaveLength(2);
    expect(batteries.report.warningCount).toBeGreaterThan(0);
    expect(inverters.accepted).toHaveLength(2);
    expect(inverters.report.warningCount).toBeGreaterThan(0);
  });

  it('quarantines malformed records without losing their fingerprint or source identity', () => {
    const result = importReferencePvModules(source('modules', [null, {
      maker: '', code: 123, power: 'unknown', vmp: Number.POSITIVE_INFINITY, voc_stc: null, imp_stc: 1, isc_stc: 2,
    }]), context);
    expect(result.accepted).toEqual([]);
    expect(result.quarantined).toHaveLength(2);
    expect(result.quarantined.every((record) => record.rawFingerprint.length === 64)).toBe(true);
    expect(result.report.acceptedRecordCount + result.report.quarantinedRecordCount).toBe(result.report.inputRecordCount);
  });

  it('resolves locality-linked weather metadata and quarantines invalid links or ranges', () => {
    const localities = importReferenceLocalities(source('localities', [{
      id: 1, name: 'Lomé', country_code: 'tg', latitude: 6.17, longitude: 1.23,
    }, {
      id: 2, name: 'Invalid', country_code: 'TG', latitude: 91, longitude: 1.23,
    }]), context);
    const weather = importReferenceWeatherSources(source('weather', [{
      id: 1, locality_id: '1', provider: 'PVGIS', source_name: 'TMY', default_tilt: 10, default_azimuth: 180,
    }, {
      id: 2, locality_id: '404', provider: 'PVGIS', source_name: 'Unknown locality', default_tilt: 10,
    }, {
      id: 3, locality_id: '1', provider: 'PVGIS', source_name: 'Invalid azimuth', default_azimuth: 360,
    }]), localities.canonicalIdBySourceRecordId, context);
    expect(localities.accepted).toHaveLength(1);
    expect(localities.quarantined).toHaveLength(1);
    expect(weather.accepted).toHaveLength(1);
    expect(weather.quarantined).toHaveLength(2);
    expect(weather.quarantined.flatMap((record) => record.issues.map((issue) => issue.code)))
      .toContain('WEATHER_SOURCE_LOCALITY_UNKNOWN');
  });

  it('handles valid, malformed, and non-normalizable legacy load documents', () => {
    const invalidDocument = importLegacyLoadProfiles({ sourceId: 'profiles', sourceSha256: digest, document: [] }, context);
    const mixedDocument = importLegacyLoadProfiles({
      sourceId: 'profiles', sourceSha256: digest, document: {
        profiles: {
          invalidSet: {},
          default: { categories: {
            valid: { display_name: 'Valid', shape: Array.from({ length: 24 }, () => 1) },
            invalidLength: { display_name: 'Short', shape: [1, 2] },
            invalidWeight: { display_name: 'Bad', shape: Array.from({ length: 24 }, (_, index) => index === 0 ? 'bad' : 1) },
            zeroSum: { display_name: 'Zero', shape: Array.from({ length: 24 }, () => 0) },
          } },
        },
      },
    }, context);
    expect(invalidDocument.quarantined).toHaveLength(1);
    expect(mixedDocument.accepted).toHaveLength(1);
    expect(mixedDocument.quarantined).toHaveLength(4);
  });

  it('classifies every legacy scalar boundary without coercion', () => {
    expect(parseLegacyScalar(true).state).toBe('invalid');
    expect(parseLegacyScalar({}).state).toBe('invalid');
    expect(parseLegacyScalar('.5')).toEqual({ state: 'parsed', value: 0.5 });
    expect(parseLegacyScalar('-1,25')).toEqual({ state: 'parsed', value: -1.25 });
    expect(parseLegacyScalar(undefined)).toEqual({ state: 'missing', value: null });
  });
});
