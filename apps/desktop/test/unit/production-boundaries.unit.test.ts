import { describe, expect, it } from 'vitest';
import { scanText } from '../../../../tools/ui/check-production-boundaries.mjs';

describe('production boundary scan', () => {
  it('reports parent and prototype runtime references', () => {
    expect(scanText("import '../design-proposition/app';\nconst engine = 'MockEngine';", 'App.tsx')).toHaveLength(2);
  });

  it('allows a canonical JSON import inside an adapter', () => {
    expect(scanText("import data from '../../packages/catalog/data/equipment.json';", 'src/app/adapters/canonicalCatalog.ts')).toEqual([]);
  });
});
