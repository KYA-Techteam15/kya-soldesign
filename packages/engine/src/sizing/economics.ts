export interface StorageCostConversionInput {
  readonly totalPriceMinor: number | null;
  readonly referenceStorageKwh: number | null;
}

export interface ReferenceCostConversionInput {
  readonly totalPriceMinor: number | null;
  readonly referenceSize: number | null;
}

export type StorageCostConversionResult =
  | { readonly status: 'available'; readonly totalPriceMinor: number; readonly referenceStorageKwh: number; readonly unroundedSpecificCostMinorPerKwh: number; readonly specificCostMinorPerKwh: number; readonly roundingRule: 'nearest-minor-unit' }
  | { readonly status: 'blocked'; readonly code: 'TOTAL_PRICE_REQUIRED' | 'REFERENCE_STORAGE_REQUIRED' | 'TOTAL_PRICE_INVALID' | 'REFERENCE_STORAGE_INVALID' };

export interface MainEquipmentCostInput {
  readonly pvKwc: number;
  readonly storageKwh: number;
  readonly inverterKw: number;
  readonly pvSpecificCostMinorPerKw: number | null;
  readonly storageSpecificCostMinorPerKwh: number | null;
  readonly inverterSpecificCostMinorPerKw: number | null;
}

export type MainEquipmentCostResult =
  | { readonly status: 'available'; readonly pvMinor: number; readonly storageMinor: number; readonly inverterMinor: number; readonly mainEquipmentMinor: number; readonly scope: 'pv-storage-inverter-only' }
  | { readonly status: 'blocked'; readonly missing: readonly ('pvSpecificCostMinorPerKw' | 'storageSpecificCostMinorPerKwh' | 'inverterSpecificCostMinorPerKw')[] };

export function convertStorageCost(input: StorageCostConversionInput): StorageCostConversionResult {
  if (input.totalPriceMinor === null) return { status: 'blocked', code: 'TOTAL_PRICE_REQUIRED' };
  if (input.referenceStorageKwh === null) return { status: 'blocked', code: 'REFERENCE_STORAGE_REQUIRED' };
  if (!Number.isInteger(input.totalPriceMinor) || input.totalPriceMinor <= 0) return { status: 'blocked', code: 'TOTAL_PRICE_INVALID' };
  if (!Number.isFinite(input.referenceStorageKwh) || input.referenceStorageKwh <= 0) return { status: 'blocked', code: 'REFERENCE_STORAGE_INVALID' };
  const unrounded = input.totalPriceMinor / input.referenceStorageKwh;
  return { status: 'available', totalPriceMinor: input.totalPriceMinor, referenceStorageKwh: input.referenceStorageKwh, unroundedSpecificCostMinorPerKwh: unrounded, specificCostMinorPerKwh: Math.round(unrounded), roundingRule: 'nearest-minor-unit' };
}

export function convertReferenceCost(input: ReferenceCostConversionInput): StorageCostConversionResult {
  return convertStorageCost({ totalPriceMinor: input.totalPriceMinor, referenceStorageKwh: input.referenceSize });
}

export function estimateMainEquipmentCost(input: MainEquipmentCostInput): MainEquipmentCostResult {
  const missing = (['pvSpecificCostMinorPerKw', 'storageSpecificCostMinorPerKwh', 'inverterSpecificCostMinorPerKw'] as const).filter((key) => input[key] === null || !Number.isFinite(input[key]) || input[key]! < 0);
  if (missing.length > 0) return { status: 'blocked', missing };
  const pvMinor = Math.round(input.pvKwc * input.pvSpecificCostMinorPerKw!);
  const storageMinor = Math.round(input.storageKwh * input.storageSpecificCostMinorPerKwh!);
  const inverterMinor = Math.round(input.inverterKw * input.inverterSpecificCostMinorPerKw!);
  return { status: 'available', pvMinor, storageMinor, inverterMinor, mainEquipmentMinor: pvMinor + storageMinor + inverterMinor, scope: 'pv-storage-inverter-only' };
}
