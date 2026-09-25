import { describe, expect, it } from 'vitest';
import type { CableSizingResult, ProtectionSizingResult, SizingOutputV1 } from '@ksd/engine';
import { generateSingleLineDiagram, buildTopology, spread, SYNOPTIC_OPTIONS, protectionNature } from './index.js';
import { layoutDiagram } from './layout/index.js';
import { collapse, cableNote } from './layout/builder.js';
import { findCollisions } from './layout/geometry.js';
import type { DiagramSystemType, TopologySource } from './topology.js';
import { EN_LABELS, FR_LABELS } from './labels.js';
import { SHEETS } from './layout/constants.js';

const sizing = (over: Partial<SizingOutputV1> = {}): SizingOutputV1 =>
  ({
    selectedEquipment: { moduleId: 'm', batteryId: 'b', inverterId: 'i' },
    pv: { modulesInSeries: 10, stringsInParallel: 3, totalModules: 30, requiredPowerKwc: 12, obtainedPowerKwc: 13.65, marginRatio: 0.1, vmpOperatingV: 410, vocColdV: 556, iscA: 34.8 },
    battery: { unitsInSeries: 4, stringsInParallel: 2, totalUnits: 8, requiredEnergyKwh: 9, obtainedEnergyKwh: 19.2, usefulEnergyKwh: 9.6, marginRatio: 0.1, bankVoltageV: 48 },
    inverter: { count: 1, requiredPowerKw: 4, obtainedPowerKw: 5, marginRatio: 0.2 },
    compatibility: { compatible: true, issues: [], warnings: [] },
    valid: true,
    ...over,
  }) as SizingOutputV1;

const protections = (pvType = 'Disjoncteur DC'): ProtectionSizingResult[] => [
  { segment: 'pv_inverter', kind: pvType, selectedType: pvType, caliberA: 32, serviceVoltageV: 556, quantity: 2 },
  { segment: 'inverter_battery', kind: 'Disjoncteur DC', selectedType: 'Disjoncteur DC', caliberA: 125, serviceVoltageV: 48, quantity: 2 },
  { segment: 'inverter_load', kind: 'Disjoncteur AC', selectedType: 'Disjoncteur AC', caliberA: 32, serviceVoltageV: 230, quantity: 1 },
].map((item) => ({ ...item, allowedTypes: [], requiredA: 10, minimumCurrentA: 10, maximumCurrentA: null, options: [], compatibleRatingsA: [], recommendedType: item.kind, recommendedRatingA: item.caliberA, selectedRatingA: item.caliberA, exact: true, overridden: false, followsSuggestion: false, state: 'valid', methodVersion: 'core-v2' })) as ProtectionSizingResult[];

const cables: CableSizingResult[] = (['pv_inverter', 'inverter_battery', 'inverter_load'] as const).map((segment) => ({
  segment, state: 'valid', currentA: 20, voltageV: 48, minimalSection: 4, normalizedSection: segment === 'inverter_battery' ? 50 : segment === 'pv_inverter' ? 2.5 : 6,
  dropPercent: 1, maxDropPercent: 3, thermalSection: 4, voltageDropSection: 6, governingConstraint: 'thermal', resistivity: 0.017, correctionFactor: 1,
  installationMethod: 'C', currentBasis: 'selected-rating', provisional: false, designTemperatureC: 30, temperatureAssumed: true, ampacityA: 36, issues: [],
}));

const source = (over: Partial<TopologySource> = {}): TopologySource => ({
  systemType: 'standalone_all_in_one',
  sizing: sizing(),
  protections: protections(),
  cables,
  cableLengthsM: { pv_inverter: 25, inverter_battery: 4, inverter_load: 18 },
  module: { powerW: 455, vocV: 49.6, iscA: 11.6, product: 'Canadian · CS7L-455' },
  battery: { voltageV: 12, capacityAh: 200, product: 'Victron · GEL 200' },
  inverter: { acVoltageV: 230, product: 'DEYE · SUN-5K' },
  title: { company: 'KYA-Energy Group', project: 'Centrale de Bouaké', client: 'Coopérative du Gbêkê', reference: 'KSD-2026-042', location: 'Bouaké', date: '04/09/2026', author: 'J.-C. K.', sheet: '1/1' },
  ...over,
});

describe('répartition, condensation, notation', () => {
  it('verse le reste sur les premiers groupes', () => {
    expect(spread(7, 3)).toEqual([3, 2, 2]);
    expect(spread(4, 0)).toEqual([]);
  });

  it('ne condense qu’au-delà du seuil, en conservant le dernier élément', () => {
    expect(collapse(3, 4)).toEqual({ head: 3, tail: 0, hidden: 0 });
    expect(collapse(10, 4)).toEqual({ head: 2, tail: 1, hidden: 7 });
  });

  it('écrit les câbles en notation « n × section », au séparateur de la langue', () => {
    expect(cableNote({ conductors: 2, sectionMm2: 2.5, lengthM: 25 }, FR_LABELS)).toBe('2 × 2,5 mm² · 25 m');
    expect(cableNote({ conductors: 2, sectionMm2: 2.5, lengthM: 25 }, EN_LABELS)).toBe('2 × 2.5 mm² · 25 m');
    expect(cableNote({ conductors: 2, sectionMm2: null, lengthM: 4 })).toBeNull();
  });
});

describe('topologie', () => {
  const cases: readonly [DiagramSystemType, { battery: boolean; grid: boolean; generator: boolean; meter: boolean }][] = [
    ['standalone_inverter_controller', { battery: true, grid: false, generator: false, meter: false }],
    ['standalone_all_in_one', { battery: true, grid: false, generator: false, meter: false }],
    ['grid_tied', { battery: false, grid: true, generator: false, meter: true }],
    ['pv_diesel', { battery: true, grid: false, generator: true, meter: false }],
    ['solar_water_pumping', { battery: false, grid: false, generator: false, meter: false }],
    ['solar_street_light', { battery: true, grid: false, generator: false, meter: false }],
  ];
  for (const [systemType, expected] of cases) {
    it(`construit ${systemType}`, () => {
      const topology = buildTopology(source({ systemType }));
      expect(topology.battery !== null).toBe(expected.battery);
      expect(topology.ac.grid !== null).toBe(expected.grid);
      expect(topology.ac.generator !== null).toBe(expected.generator);
      expect(topology.ac.meter).toBe(expected.meter);
      expect(layoutDiagram(topology).symbols.length).toBeGreaterThan(8);
    });
  }

  it('déduit la nature de l’appareil du type retenu : le symbole dit vrai', () => {
    expect(protectionNature('Fusible gPV')).toBe('fuse-switch');
    expect(protectionNature('Disjoncteur DC')).toBe('breaker');
    const fuse = generateSingleLineDiagram(source({ protections: protections('Fusible gPV') })).plan;
    expect(fuse.symbols.some((symbol) => symbol.kind === 'fuse-switch' && symbol.reference === 'Q1')).toBe(true);
    const breaker = generateSingleLineDiagram(source()).plan;
    expect(breaker.symbols.some((symbol) => symbol.kind === 'dc-breaker' && symbol.reference === 'Q1')).toBe(true);
  });

  it('porte la mention « à définir » plutôt qu’un calibre inventé', () => {
    const blank = protections().map((item) => ({ ...item, caliberA: null }));
    expect(generateSingleLineDiagram(source({ protections: blank })).svg).toContain('à définir');
  });

  it('déclare une erreur quand le dimensionnement n’est pas validé', () => {
    expect(buildTopology(source({ sizing: sizing({ valid: false }) })).issues.some((issue) => issue.level === 'error')).toBe(true);
  });
});

describe('planche', () => {
  it('est une planche paysage lue de gauche à droite', () => {
    const { plan } = generateSingleLineDiagram(source());
    expect(plan.width).toBeGreaterThan(plan.height);
    expect(plan.format.endsWith('landscape')).toBe(true);
    const field = plan.frames.find((frame) => frame.id === 'frame-pv')!;
    const inverter = plan.symbols.find((symbol) => symbol.kind === 'inverter')!;
    const load = plan.symbols.find((symbol) => symbol.kind === 'load')!;
    expect(field.x).toBeLessThan(inverter.x);
    expect(inverter.x).toBeLessThan(load.x);
  });

  it('pose les parafoudres en dérivation vers le conducteur de protection', () => {
    const { plan } = generateSingleLineDiagram(source());
    for (const spd of plan.symbols.filter((symbol) => symbol.kind === 'dc-spd' || symbol.kind === 'ac-spd')) {
      const bottom = { x: spd.x + spd.width / 2, y: spd.y + spd.height };
      expect(plan.wires.some((wire) => wire.conductor === 'earth' && wire.points[0]!.x === bottom.x && wire.points[0]!.y === bottom.y)).toBe(true);
    }
  });

  it('dimensionne la borne principale de terre au nombre de raccordements', () => {
    const { plan } = generateSingleLineDiagram(source());
    const bar = plan.symbols.find((symbol) => symbol.kind === 'earth-bar')!;
    const taps = plan.wires.filter((wire) => wire.conductor === 'earth' && wire.points.length === 2 && wire.points[0]!.x === wire.points[1]!.x && wire.points[1]!.y === bar.y + bar.height / 2).length;
    expect(bar.data['taps']).toBe(taps);
  });

  it('marque chaque liaison câblée de son nombre de conducteurs', () => {
    const { plan } = generateSingleLineDiagram(source());
    expect(plan.wires.filter((wire) => wire.conductors === 2).length).toBeGreaterThanOrEqual(2);
    expect(plan.wires.some((wire) => wire.conductors === 3)).toBe(true);
  });

  it('écrit la version émise au cartouche', () => {
    const { svg } = generateSingleLineDiagram(source({ title: { ...source().title, revision: 'v2' } }));
    expect(svg).toContain('KSD-2026-042 · v2');
  });

  it('porte un cadre de repérage et y situe chaque appareil de la nomenclature', () => {
    const { plan } = generateSingleLineDiagram(source());
    expect(plan.grid).not.toBeNull();
    expect(plan.bom.find((row) => row.reference === 'Q1')?.gridRef).toMatch(/^[A-Z]\d+$/);
    expect(plan.bom.every((row) => row.gridRef !== '')).toBe(true);
  });

  it('retient la plus petite planche normalisée qui reste lisible', () => {
    const auto = generateSingleLineDiagram(source()).plan;
    expect(auto.smallestTextPt).toBeGreaterThanOrEqual(6);
    const index = SHEETS.findIndex((sheet) => sheet.format === auto.format);
    for (const smaller of SHEETS.slice(0, index)) {
      expect(generateSingleLineDiagram(source({ options: { format: smaller.format } })).plan.smallestTextPt).toBeLessThan(6);
    }
  });

  it('alerte, sans rien masquer, quand l’appelant impose une planche trop petite', () => {
    const big = source({ sizing: sizing({ pv: { ...sizing().pv, stringsInParallel: 9, modulesInSeries: 22, totalModules: 198 } }) });
    const pinned = generateSingleLineDiagram({ ...big, options: { format: 'a4-landscape' } }).plan;
    expect(pinned.format).toBe('a4-landscape');
    expect(pinned.issues.find((issue) => issue.message.includes('pt'))?.level).toBe('warning');
  });

  it('tient le synoptique du rapport sur une page A4', () => {
    const synoptic = generateSingleLineDiagram(source({ options: SYNOPTIC_OPTIONS })).plan;
    expect(synoptic.format).toBe('a4-landscape');
    expect(synoptic.smallestTextPt).toBeGreaterThanOrEqual(5.5);
    expect(synoptic.grid).toBeNull();
    expect(synoptic.showTitleBlock).toBe(false);
  });
});

describe('aucun texte ne touche un conducteur, un symbole ou un autre texte (FR-B4)', () => {
  const systems: DiagramSystemType[] = ['standalone_all_in_one', 'standalone_inverter_controller', 'grid_tied', 'pv_diesel', 'solar_water_pumping', 'solar_street_light'];
  const fields = [[1, 7], [3, 10], [9, 22]] as const;
  for (const systemType of systems) {
    for (const [strings, series] of fields) {
      for (const pvType of ['Fusible gPV', 'Disjoncteur DC']) {
        for (const detail of ['full', 'synoptic'] as const) {
          for (const labels of [FR_LABELS, EN_LABELS]) {
            it(`${systemType} · ${strings}×${series} · ${pvType} · ${detail} · ${labels.decimal === ',' ? 'fr' : 'en'}`, () => {
              const { plan } = generateSingleLineDiagram(source({
                systemType,
                labels,
                protections: protections(pvType),
                sizing: sizing({ pv: { ...sizing().pv, stringsInParallel: strings, modulesInSeries: series, totalModules: strings * series } }),
                options: detail === 'synoptic' ? SYNOPTIC_OPTIONS : {},
              }));
              expect(findCollisions(plan)).toEqual([]);
            });
          }
        }
      }
    }
  }
});

describe('rendu', () => {
  it('est déterministe au caractère près', () => {
    expect(generateSingleLineDiagram(source()).svg).toBe(generateSingleLineDiagram(source()).svg);
  });

  it('produit un SVG autonome et dimensionné', () => {
    const { svg, plan } = generateSingleLineDiagram(source());
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${plan.width} ${plan.height}"`);
  });

  it('échappe le contenu du cartouche et tronque ce qui déborde', () => {
    const { svg } = generateSingleLineDiagram(source({ title: { ...source().title, client: 'Dupont & <Fils>', project: 'Centre de santé intercommunal de Bombouaka et environs (extension 2027)' } }));
    expect(svg).toContain('Dupont &amp; &lt;Fils&gt;');
    expect(svg).not.toContain('<Fils>');
    expect(svg).toContain('…');
  });

  it('n’écrit aucun littéral français quand on lui passe le dictionnaire anglais', () => {
    const { svg } = generateSingleLineDiagram(source({ labels: EN_LABELS }));
    expect(svg).toContain('PV array');
    expect(svg).toContain('Legend');
    expect(svg).not.toContain('Champ PV');
  });
});
