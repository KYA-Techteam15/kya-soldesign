import { describe, expect, it } from 'vitest';
import { asEquipmentRecord, archiveUserEquipment, duplicateEquipment, updateUserEquipment } from '../../src/user-equipment.js';
import type { Equipment } from '../../src/schemas.js';

const module: Equipment = { kind: 'pv-module', id: 'kya-module', manufacturer: 'KYA', model: 'M-1', provenance: { sourceId: 'catalog', sourceRecordId: 'M-1', sourceSha256: 'a'.repeat(64), transformationVersion: '1.0.0' }, nominalPowerW: 300, voltageAtMaximumPowerV: 30, openCircuitVoltageV: 38, currentAtMaximumPowerA: 10, shortCircuitCurrentA: 11, technology: 'mono', areaM2: 2, temperatureCoefficientPmaxPerC: null, temperatureCoefficientVocPerC: null, nominalOperatingCellTemperatureC: 45 };

describe('equipment ownership', () => {
  it('duplicates a canonical record into an independent user record', () => {
    const result = duplicateEquipment(asEquipmentRecord(module), 'user-module');
    expect(result).toMatchObject({ status: 'ok', equipment: { id: 'user-module', origin: 'user', derivedFromId: 'kya-module', version: 1 } });
    expect(module.id).toBe('kya-module');
  });
  it('refuses editing and archiving canonical data', () => {
    const result = updateUserEquipment(asEquipmentRecord(module), 1, { ...module, model: 'changed' });
    expect(result).toEqual({ status: 'rejected', code: 'KYA_IMMUTABLE' });
    expect(archiveUserEquipment(asEquipmentRecord(module))).toEqual({ status: 'rejected', code: 'KYA_IMMUTABLE' });
  });
  it('versions user updates and detects stale writes', () => {
    const original = { ...asEquipmentRecord(module), origin: 'user' as const, version: 1 };
    const updated = updateUserEquipment(original, 1, { ...module, model: 'changed' });
    expect(updated).toMatchObject({ status: 'ok', equipment: { version: 2, supersedesVersion: 1 } });
    expect(updateUserEquipment(original, 2, module)).toEqual({ status: 'rejected', code: 'USER_VERSION_CONFLICT' });
  });
});
