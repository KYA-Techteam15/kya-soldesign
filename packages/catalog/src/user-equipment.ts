import { validateEquipment, type Equipment } from './schemas.js';

export type EquipmentOrigin = 'kya' | 'user';
export type EquipmentRecordV2 = Equipment & {
  readonly origin: EquipmentOrigin;
  readonly version: number;
  readonly derivedFromId: string | null;
  readonly supersedesVersion: number | null;
  readonly calculationEligibility: { readonly state: 'eligible' | 'ineligible'; readonly codes: readonly string[] };
  readonly archivedAt: string | null;
}

export type UserEquipmentCommandResult =
  | { readonly status: 'ok'; readonly equipment: EquipmentRecordV2 }
  | { readonly status: 'rejected'; readonly code: 'KYA_IMMUTABLE' | 'USER_VERSION_CONFLICT' | 'EQUIPMENT_INVALID' | 'USER_ALREADY_ARCHIVED'; readonly issues?: readonly string[] };

export function asEquipmentRecord(equipment: Equipment): EquipmentRecordV2 {
  const validation = validateEquipment(equipment);
  const codes = validation.issues.map((issue) => issue.code);
  return {
    ...equipment,
    origin: equipment.origin ?? 'kya',
    version: equipment.version ?? 1,
    derivedFromId: equipment.derivedFromId ?? null,
    supersedesVersion: equipment.supersedesVersion ?? null,
    calculationEligibility: equipment.calculationEligibility ?? { state: codes.some((code) => code.includes('INVALID')) ? 'ineligible' : 'eligible', codes },
    archivedAt: equipment.archivedAt ?? null,
  } as EquipmentRecordV2;
}

export function duplicateEquipment(source: EquipmentRecordV2, newId: string): UserEquipmentCommandResult {
  if (!newId.trim()) return { status: 'rejected', code: 'EQUIPMENT_INVALID' };
  return { status: 'ok', equipment: { ...clone(source), id: newId, origin: 'user', version: 1, derivedFromId: source.id, supersedesVersion: null, archivedAt: null } };
}

export function createUserEquipment(equipment: Equipment, id: string): UserEquipmentCommandResult {
  const candidate = asEquipmentRecord({ ...clone(equipment), id, origin: 'user', version: 1, derivedFromId: null, supersedesVersion: null, archivedAt: null });
  const validation = validateEquipment(candidate);
  if (validation.equipment === null || validation.issues.some((issue) => issue.severity === 'error')) return { status: 'rejected', code: 'EQUIPMENT_INVALID', issues: validation.issues.map((issue) => issue.code) };
  return { status: 'ok', equipment: candidate };
}

export function updateUserEquipment(source: EquipmentRecordV2, expectedVersion: number, patch: Equipment): UserEquipmentCommandResult {
  if (source.origin !== 'user') return { status: 'rejected', code: 'KYA_IMMUTABLE' };
  if (source.archivedAt !== null) return { status: 'rejected', code: 'USER_ALREADY_ARCHIVED' };
  if (source.version !== expectedVersion) return { status: 'rejected', code: 'USER_VERSION_CONFLICT' };
  const candidate = asEquipmentRecord({ ...clone(patch), id: source.id, origin: 'user', version: source.version + 1, derivedFromId: source.derivedFromId, supersedesVersion: source.version, archivedAt: null });
  const validation = validateEquipment(candidate);
  if (validation.equipment === null || validation.issues.some((issue) => issue.severity === 'error')) return { status: 'rejected', code: 'EQUIPMENT_INVALID', issues: validation.issues.map((issue) => issue.code) };
  return { status: 'ok', equipment: candidate };
}

export function archiveUserEquipment(source: EquipmentRecordV2): UserEquipmentCommandResult {
  if (source.origin !== 'user') return { status: 'rejected', code: 'KYA_IMMUTABLE' };
  if (source.archivedAt !== null) return { status: 'rejected', code: 'USER_ALREADY_ARCHIVED' };
  return { status: 'ok', equipment: { ...source, archivedAt: new Date().toISOString() } };
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }
