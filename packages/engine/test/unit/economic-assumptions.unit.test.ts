import { describe, expect, it } from 'vitest';
import { convertReferenceCost, convertStorageCost, estimateMainEquipmentCost } from '../../src/sizing/economics.js';

describe('detailed sizing economics', () => {
  it('converts a reference storage price to the canonical cost', () => {
    expect(convertStorageCost({ totalPriceMinor: 1_500_000, referenceStorageKwh: 10 })).toMatchObject({ status: 'available', specificCostMinorPerKwh: 150_000 });
  });

  it('blocks an incomplete conversion without inventing a value', () => {
    expect(convertStorageCost({ totalPriceMinor: 0, referenceStorageKwh: 10 })).toEqual({ status: 'blocked', code: 'TOTAL_PRICE_INVALID' });
    expect(convertStorageCost({ totalPriceMinor: 100, referenceStorageKwh: null })).toEqual({ status: 'blocked', code: 'REFERENCE_STORAGE_REQUIRED' });
  });

  it('uses the same canonical conversion for PV panels and inverters', () => {
    expect(convertReferenceCost({ totalPriceMinor: 60_000, referenceSize: 0.455 })).toMatchObject({ status: 'available', specificCostMinorPerKwh: 131_868 });
    expect(convertReferenceCost({ totalPriceMinor: 1_933_800, referenceSize: 20 })).toMatchObject({ status: 'available', specificCostMinorPerKwh: 96_690 });
  });

  it('estimates only the declared main equipment scope', () => {
    expect(estimateMainEquipmentCost({ pvKwc: 2.1, storageKwh: 10, inverterKw: 2, pvSpecificCostMinorPerKw: 300_000, storageSpecificCostMinorPerKwh: 150_000, inverterSpecificCostMinorPerKw: 100_000 })).toMatchObject({ status: 'available', pvMinor: 630_000, storageMinor: 1_500_000, inverterMinor: 200_000, mainEquipmentMinor: 2_330_000, scope: 'pv-storage-inverter-only' });
    expect(estimateMainEquipmentCost({ pvKwc: 1, storageKwh: 1, inverterKw: 1, pvSpecificCostMinorPerKw: null, storageSpecificCostMinorPerKwh: 1, inverterSpecificCostMinorPerKw: 1 })).toEqual({ status: 'blocked', missing: ['pvSpecificCostMinorPerKw'] });
  });
});
