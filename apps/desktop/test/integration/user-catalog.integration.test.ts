import { describe, expect, it } from 'vitest';
import { asEquipmentRecord, updateUserEquipment, type Equipment } from '@ksd/catalog';
import { LocalUserCatalog, type UserCatalogStorage } from '../../src/app/adapters/userCatalog.js';

const source: Equipment = { kind: 'pv-module', id: 'user-module', manufacturer: 'Utilisateur', model: 'M-1', provenance: { sourceId: 'user-catalog', sourceRecordId: 'M-1', sourceSha256: 'a'.repeat(64), transformationVersion: '2.0.0' }, nominalPowerW: 400, voltageAtMaximumPowerV: 34, openCircuitVoltageV: 42, currentAtMaximumPowerA: 11, shortCircuitCurrentA: 12, technology: 'Mono', areaM2: 2, temperatureCoefficientPmaxPerC: -0.0035, temperatureCoefficientVocPerC: -0.0028, nominalOperatingCellTemperatureC: 45, origin: 'user', version: 1, derivedFromId: null, supersedesVersion: null, archivedAt: null };

class MemoryStorage implements UserCatalogStorage {
  private readonly values = new Map<string, string>();
  public getItem(key: string): string | null { return this.values.get(key) ?? null; }
  public setItem(key: string, value: string): void { this.values.set(key, value); }
}

describe('local user catalog', () => {
  it('persists, versions and archives a user record with optimistic locking', async () => {
    const catalog = new LocalUserCatalog(new MemoryStorage(), () => '2026-08-28T12:00:00.000Z');
    const first = asEquipmentRecord(source);
    await catalog.create(first);
    const command = updateUserEquipment(first, 1, { ...source, model: 'M-2' });
    expect(command.status).toBe('ok');
    if (command.status !== 'ok') return;
    await catalog.replace(command.equipment, 1);
    await expect(catalog.replace(command.equipment, 1)).rejects.toThrow('USER_EQUIPMENT_VERSION_CONFLICT');
    await catalog.archive(first.id, 2);
    expect(await catalog.list()).toMatchObject([{ model: 'M-2', version: 2, archivedAt: '2026-08-28T12:00:00.000Z' }]);
  });
});
