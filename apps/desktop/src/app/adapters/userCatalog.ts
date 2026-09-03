import type { EquipmentRecordV2 } from '@ksd/catalog';
import type { UserCatalogPort } from '../contracts.js';

const STORAGE_KEY = 'ksd.user-equipment.v2';
export interface UserCatalogStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; }

/** Local persistence boundary; it can be replaced by SQLite/Tauri without changing the catalog commands. */
export class LocalUserCatalog implements UserCatalogPort {
  public constructor(private readonly storage: UserCatalogStorage | null = browserStorage(), private readonly now: () => string = () => new Date().toISOString()) {}
  public async list(): Promise<readonly EquipmentRecordV2[]> { return readRecords(this.storage); }
  public async create(record: EquipmentRecordV2): Promise<void> { const records = readRecords(this.storage); if (records.some((item) => item.id === record.id)) throw new Error('USER_EQUIPMENT_ALREADY_EXISTS'); writeRecords(this.storage, [...records, record]); }
  public async replace(record: EquipmentRecordV2, expectedVersion: number): Promise<void> { const records = readRecords(this.storage); const current = records.find((item) => item.id === record.id); if (current === undefined) throw new Error('USER_EQUIPMENT_NOT_FOUND'); if (current.version !== expectedVersion) throw new Error('USER_EQUIPMENT_VERSION_CONFLICT'); writeRecords(this.storage, records.map((item) => item.id === record.id ? record : item)); }
  public async archive(id: string, expectedVersion: number): Promise<void> { const records = readRecords(this.storage); const current = records.find((item) => item.id === id); if (current === undefined) throw new Error('USER_EQUIPMENT_NOT_FOUND'); if (current.version !== expectedVersion) throw new Error('USER_EQUIPMENT_VERSION_CONFLICT'); writeRecords(this.storage, records.map((item) => item.id === id ? { ...item, archivedAt: this.now() } : item)); }
}

function readRecords(storage: UserCatalogStorage | null): EquipmentRecordV2[] {
  if (storage === null) return [];
  try { const value: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '[]'); return Array.isArray(value) ? value as EquipmentRecordV2[] : []; } catch { return []; }
}
function writeRecords(storage: UserCatalogStorage | null, records: readonly EquipmentRecordV2[]): void { storage?.setItem(STORAGE_KEY, JSON.stringify(records)); }
function browserStorage(): UserCatalogStorage | null { return typeof localStorage === 'undefined' ? null : localStorage; }
