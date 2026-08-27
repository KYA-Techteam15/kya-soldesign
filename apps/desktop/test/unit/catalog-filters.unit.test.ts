import { describe, expect, it } from 'vitest';
import type { Equipment } from '@ksd/catalog';
import { catalogOptions, emptyCatalogFilters, filterEquipment } from '../../src/app/models/catalogFilters.js';

const equipment = [
  { kind: 'pv-module', id: 'a', manufacturer: 'Alpha', model: 'A 250', nominalPowerW: 250, voltageAtMaximumPowerV: 30, technology: 'mono' },
  { kind: 'pv-module', id: 'b', manufacturer: 'Beta', model: 'B 400', nominalPowerW: 400, voltageAtMaximumPowerV: 42, technology: 'poly' },
  { kind: 'pv-module', id: 'c', manufacturer: 'Alpha', model: 'A 450', nominalPowerW: 450, voltageAtMaximumPowerV: 44, technology: 'poly' },
] as unknown as readonly Equipment[];

describe('catalog filters', () => {
  it('combines text and numeric ranges', () => {
    expect(filterEquipment(equipment, 'alpha', { ...emptyCatalogFilters, minPower: '400', maxVoltage: '45' }).map((item) => item.id)).toEqual(['c']);
  });

  it('recomputes each option list from the other active filters', () => {
    const options = catalogOptions(equipment, '', { ...emptyCatalogFilters, technology: 'mono' });
    expect(options.manufacturers).toEqual(['Alpha']);
    expect(options.technologies).toEqual(['mono', 'poly']);
  });
});
