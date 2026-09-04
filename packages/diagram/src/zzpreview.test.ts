import { it } from 'vitest';
import { writeFileSync, mkdirSync } from 'node:fs';
import type { CableSizingResult, ProtectionSizingResult, SizingOutputV1 } from '@ksd/engine';
import { generateSingleLineDiagram, SYNOPTIC_OPTIONS } from './index.js';
import type { TopologySource } from './topology.js';

const OUT = 'C:/Users/LENOVO/AppData/Local/Temp/claude/g--Code-kya-kya-sol-design-kya-ksd-kya-sol-design/6507a1e3-7ff4-4adc-a9cf-bcd9d8a5387b/scratchpad/svg';

const sizing = (over: Partial<SizingOutputV1> = {}): SizingOutputV1 => ({
  selectedEquipment: { moduleId: 'm', batteryId: 'b', inverterId: 'i' },
  pv: { modulesInSeries: 10, stringsInParallel: 3, totalModules: 30, requiredPowerKwc: 12, obtainedPowerKwc: 13.65, marginRatio: 0.1, vmpOperatingV: 410, vocColdV: 556, iscA: 34.8 },
  battery: { unitsInSeries: 4, stringsInParallel: 2, totalUnits: 8, requiredEnergyKwh: 9, obtainedEnergyKwh: 19.2, usefulEnergyKwh: 9.6, marginRatio: 0.1, bankVoltageV: 48 },
  inverter: { count: 1, requiredPowerKw: 4, obtainedPowerKw: 5, marginRatio: 0.2 },
  compatibility: { compatible: true, issues: [], warnings: [] },
  valid: true, ...over,
}) as SizingOutputV1;

const protections = [
  { segment: 'pv_inverter', kind: 'Disjoncteur DC', selectedType: 'Disjoncteur DC', caliberA: 32, serviceVoltageV: 556, quantity: 2 },
  { segment: 'inverter_battery', kind: 'Disjoncteur DC', selectedType: 'Disjoncteur DC', caliberA: 125, serviceVoltageV: 48, quantity: 2 },
  { segment: 'inverter_load', kind: 'Disjoncteur AC', selectedType: 'Disjoncteur AC', caliberA: 32, serviceVoltageV: 230, quantity: 1 },
].map((i) => ({ ...i, allowedTypes: [], requiredA: 10, minimumCurrentA: 10, maximumCurrentA: null, options: [], compatibleRatingsA: [], selectedRatingA: i.caliberA, exact: true, overridden: false, state: 'valid', methodVersion: 'core-v1' })) as ProtectionSizingResult[];

const cables: CableSizingResult[] = (['pv_inverter', 'inverter_battery', 'inverter_load'] as const).map((segment) => ({
  segment, state: 'valid', currentA: 20, voltageV: 48, minimalSection: 4,
  normalizedSection: segment === 'inverter_battery' ? 50 : 6, dropPercent: 1, maxDropPercent: 3,
  thermalSection: 4, voltageDropSection: 6, governingConstraint: 'thermal', resistivity: 0.017, correctionFactor: 1, issues: [],
})) as CableSizingResult[];

const source = (over: Partial<TopologySource> = {}): TopologySource => ({
  systemType: 'standalone_inverter_controller', sizing: sizing(), protections, cables,
  cableLengthsM: { pv_inverter: 25, inverter_battery: 4, inverter_load: 18 },
  module: { powerW: 455, vocV: 49.6, iscA: 11.6, product: 'Canadian · CS7L-455' },
  battery: { voltageV: 12, capacityAh: 200, product: 'Victron · GEL 200' },
  inverter: { acVoltageV: 230, product: 'DEYE · SUN-5K' },
  title: { company: 'KYA-Energy Group', project: 'Centrale de Bouaké', client: 'Coopérative du Gbêkê', reference: 'KSD-2026-042', location: 'Bouaké', date: '04/09/2026', author: 'J.-C. K.', sheet: '1/1' },
  ...over,
});

it('preview', () => {
  mkdirSync(OUT, { recursive: true });
  const cases: Array<[string, TopologySource]> = [
    ['01-aio-landscape', source({ systemType: 'standalone_all_in_one' })],
    ['02-controller-landscape', source()],
    ['03-synoptic-portrait', source({ options: SYNOPTIC_OPTIONS })],
    ['04-grid-tied', source({ systemType: 'grid_tied' })],
    ['05-big', source({ sizing: sizing({ pv: { modulesInSeries: 18, stringsInParallel: 8, totalModules: 144, requiredPowerKwc: 60, obtainedPowerKwc: 65.5, marginRatio: 0.1, vmpOperatingV: 740, vocColdV: 1000, iscA: 92 } as SizingOutputV1['pv'], inverter: { count: 3, requiredPowerKw: 45, obtainedPowerKw: 50, marginRatio: 0.1 } }) })],
  ];
  for (const [name, s] of cases) {
    const { svg, plan, topology } = generateSingleLineDiagram(s);
    writeFileSync(`${OUT}/${name}.svg`, svg, 'utf8');
    console.log(name, '→', plan.width + '×' + plan.height, 'symbols', plan.symbols.length, 'wires', plan.wires.length, 'smallest', plan.smallestTextPt.toFixed(2) + 'pt', 'issues', topology.issues.length);
  }
});
