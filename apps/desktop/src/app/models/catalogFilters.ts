import type { Equipment } from '@ksd/catalog';

export type CatalogFilterState = { readonly manufacturer: string; readonly technology: string; readonly type: string; readonly minPower: string; readonly maxPower: string; readonly minVoltage: string; readonly maxVoltage: string; };
export const emptyCatalogFilters: CatalogFilterState = { manufacturer: '', technology: '', type: '', minPower: '', maxPower: '', minVoltage: '', maxVoltage: '' };
const text = (value: string | null | undefined) => value?.toLocaleLowerCase() ?? '';
const number = (value: string) => value.trim() === '' ? null : Number(value);

export function filterEquipment(items: readonly Equipment[], query: string, filters: CatalogFilterState): readonly Equipment[] {
  const needle = text(query.trim()); const minPower = number(filters.minPower); const maxPower = number(filters.maxPower); const minVoltage = number(filters.minVoltage); const maxVoltage = number(filters.maxVoltage);
  return items.filter((item) => {
    if (needle && !text(item.manufacturer + ' ' + item.model).includes(needle)) return false;
    if (filters.manufacturer && (item.manufacturer ?? 'Non renseigné') !== filters.manufacturer) return false;
    if (filters.technology && item.kind !== 'inverter' && (item.technology ?? 'Non renseigné') !== filters.technology) return false;
    if (filters.type && item.kind === 'inverter' && (item.inverterType ?? 'Non renseigné') !== filters.type) return false;
    const power = item.kind === 'pv-module' ? item.nominalPowerW : item.kind === 'battery' ? item.nominalCapacityAh : item.nominalAcPowerW;
    const voltage = item.kind === 'pv-module' ? item.voltageAtMaximumPowerV : item.kind === 'battery' ? item.nominalVoltageV : item.nominalDcVoltageV;
    if (minPower !== null && (power === null || power < minPower)) return false;
    if (maxPower !== null && (power === null || power > maxPower)) return false;
    if (minVoltage !== null && (voltage === null || voltage < minVoltage)) return false;
    if (maxVoltage !== null && (voltage === null || voltage > maxVoltage)) return false;
    return true;
  });
}

export function catalogOptions(items: readonly Equipment[], query: string, filters: CatalogFilterState) {
  const remaining = (without: keyof CatalogFilterState) => filterEquipment(items, query, { ...filters, [without]: '' });
  const unique = (values: readonly (string | null | undefined)[]) => [...new Set(values.map((v) => v ?? 'Non renseigné'))].sort((a, b) => a.localeCompare(b));
  return { manufacturers: unique(remaining('manufacturer').map((item) => item.manufacturer)), technologies: unique(remaining('technology').filter((item) => item.kind !== 'inverter').map((item) => item.technology)), types: unique(remaining('type').filter((item) => item.kind === 'inverter').map((item) => item.inverterType)) };
}
