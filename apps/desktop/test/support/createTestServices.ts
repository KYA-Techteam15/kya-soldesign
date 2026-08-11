import type { ApplicationServices } from '../../src/app/contracts.js';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { unavailableCalculations } from '../../src/app/adapters/unavailableCalculations.js';

export function createTestServices(): ApplicationServices {
  return {
    projects: new InMemoryProjects(() => '2026-08-11T00:00:00.000Z'),
    catalog: new CanonicalCatalog(),
    calculations: unavailableCalculations,
  };
}
