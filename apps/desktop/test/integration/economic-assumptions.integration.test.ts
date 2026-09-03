import { describe, expect, it } from 'vitest';
import { convertStorageCost } from '@ksd/engine';
import { createEmptyProjectFile, projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';

describe('economic assumptions persistence', () => {
  it('stores and restores the canonical storage cost and its reference inputs', () => {
    const conversion = convertStorageCost({ totalPriceMinor: 1_500_000, referenceStorageKwh: 10 });
    expect(conversion.status).toBe('available');
    if (conversion.status !== 'available') return;

    const file = createEmptyProjectFile(
      '00000000-0000-4000-8000-000000000090',
      'standalone-all-in-one',
      '2026-08-28T00:00:00.000Z',
      'Hypothèses économiques',
    );
    const view = projectFileToView(file);
    view.assumptions.storageReferencePrice = 1_500_000;
    view.assumptions.storageReferenceKwh = 10;
    view.assumptions.batterySpecificCost = conversion.specificCostMinorPerKwh;
    view.assumptions.storageCostInputMode = 'component';
    view.assumptions.pvCostInputMode = 'component';
    view.assumptions.pvReferencePowerW = 455;
    view.assumptions.pvReferencePrice = 60_000;
    view.assumptions.pvSpecificCost = 131_868;
    view.assumptions.inverterCostInputMode = 'component';
    view.assumptions.inverterReferencePowerW = 20_000;
    view.assumptions.inverterReferencePrice = 1_933_800;
    view.assumptions.inverterSpecificCost = 96_690;

    const restored = projectFileToView(projectViewToFile(view));
    expect(restored.assumptions).toMatchObject({
      storageReferencePrice: 1_500_000,
      storageReferenceKwh: 10,
      batterySpecificCost: 150_000,
      storageCostInputMode: 'component',
      pvCostInputMode: 'component',
      pvReferencePowerW: 455,
      pvReferencePrice: 60_000,
      pvSpecificCost: 131_868,
      inverterCostInputMode: 'component',
      inverterReferencePowerW: 20_000,
      inverterReferencePrice: 1_933_800,
      inverterSpecificCost: 96_690,
    });
  });
});
