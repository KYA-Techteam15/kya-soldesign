import { describe, expect, it } from 'vitest';
import type { CableSizingResult, ProtectionSizingResult, SizingOutputV1 } from '@ksd/engine';
import { generateSingleLineDiagram, buildTopology, spread, SYNOPTIC_OPTIONS } from './index.js';
import { layoutDiagram } from './layout/index.js';
import { collapse, cableNote } from './layout/builder.js';
import type { DiagramSystemType, TopologySource } from './topology.js';
import { EN_LABELS } from './labels.js';
import { SHEETS } from './layout/constants.js';

const sizing = (over: Partial<SizingOutputV1> = {}): SizingOutputV1 =>
  ({
    selectedEquipment: { moduleId: 'm', batteryId: 'b', inverterId: 'i' },
    pv: {
      modulesInSeries: 10,
      stringsInParallel: 3,
      totalModules: 30,
      requiredPowerKwc: 12,
      obtainedPowerKwc: 13.65,
      marginRatio: 0.1,
      vmpOperatingV: 410,
      vocColdV: 556,
      iscA: 34.8,
    },
    battery: {
      unitsInSeries: 4,
      stringsInParallel: 2,
      totalUnits: 8,
      requiredEnergyKwh: 9,
      obtainedEnergyKwh: 19.2,
      usefulEnergyKwh: 9.6,
      marginRatio: 0.1,
      bankVoltageV: 48,
    },
    inverter: { count: 1, requiredPowerKw: 4, obtainedPowerKw: 5, marginRatio: 0.2 },
    compatibility: { compatible: true, issues: [], warnings: [] },
    valid: true,
    ...over,
  }) as SizingOutputV1;

const protections: ProtectionSizingResult[] = [
  { segment: 'pv_inverter', kind: 'Disjoncteur DC', selectedType: 'Disjoncteur DC', caliberA: 32, serviceVoltageV: 556, quantity: 2 },
  { segment: 'inverter_battery', kind: 'Disjoncteur DC', selectedType: 'Disjoncteur DC', caliberA: 125, serviceVoltageV: 48, quantity: 2 },
  { segment: 'inverter_load', kind: 'Disjoncteur AC', selectedType: 'Disjoncteur AC', caliberA: 32, serviceVoltageV: 230, quantity: 1 },
].map((item) => ({ ...item, allowedTypes: [], requiredA: 10, minimumCurrentA: 10, maximumCurrentA: null, options: [], compatibleRatingsA: [], selectedRatingA: item.caliberA, exact: true, overridden: false, state: 'valid', methodVersion: 'core-v1' })) as ProtectionSizingResult[];

const cables: CableSizingResult[] = (['pv_inverter', 'inverter_battery', 'inverter_load'] as const).map((segment) => ({
  segment,
  state: 'valid',
  currentA: 20,
  voltageV: 48,
  minimalSection: 4,
  normalizedSection: segment === 'inverter_battery' ? 50 : 6,
  dropPercent: 1,
  maxDropPercent: 3,
  thermalSection: 4,
  voltageDropSection: 6,
  governingConstraint: 'thermal',
  resistivity: 0.017,
  correctionFactor: 1,
  issues: [],
}));

const source = (over: Partial<TopologySource> = {}): TopologySource => ({
  systemType: 'standalone_inverter_controller',
  sizing: sizing(),
  protections,
  cables,
  cableLengthsM: { pv_inverter: 25, inverter_battery: 4, inverter_load: 18 },
  module: { powerW: 455, vocV: 49.6, iscA: 11.6, product: 'Canadian · CS7L-455' },
  battery: { voltageV: 12, capacityAh: 200, product: 'Victron · GEL 200' },
  inverter: { acVoltageV: 230, product: 'DEYE · SUN-5K' },
  title: {
    company: 'KYA-Energy Group',
    project: 'Centrale de Bouaké',
    client: 'Coopérative du Gbêkê',
    reference: 'KSD-2026-042',
    location: 'Bouaké',
    date: '04/09/2026',
    author: 'J.-C. K.',
    sheet: '1/1',
  },
  ...over,
});

describe('répartition et condensation', () => {
  it('verse le reste sur les premiers groupes', () => {
    expect(spread(7, 3)).toEqual([3, 2, 2]);
    expect(spread(6, 2)).toEqual([3, 3]);
    expect(spread(1, 1)).toEqual([1]);
    expect(spread(4, 0)).toEqual([]);
  });

  it('ne condense qu’au-delà du seuil, en conservant le dernier élément', () => {
    expect(collapse(3, 4)).toEqual({ head: 3, tail: 0, hidden: 0 });
    expect(collapse(10, 4)).toEqual({ head: 2, tail: 1, hidden: 7 });
    expect(collapse(22, 4).hidden).toBe(19);
  });

  it('écrit les câbles en notation « n × section »', () => {
    expect(cableNote({ conductors: 2, sectionMm2: 6, lengthM: 25 })).toBe('2 × 6 mm² · 25 m');
    expect(cableNote({ conductors: 3, sectionMm2: 6, lengthM: null })).toBe('3 × 6 mm²');
    expect(cableNote({ conductors: 2, sectionMm2: null, lengthM: 4 })).toBeNull();
    expect(cableNote(null)).toBeNull();
  });
});

describe('topologie par type de système', () => {
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
      expect(layoutDiagram(topology).symbols.length).toBeGreaterThan(10);
    });
  }

  it('n’ajoute un régulateur séparé que sur la topologie qui en comporte un', () => {
    expect(buildTopology(source()).inverters[0]?.chargeController).not.toBeNull();
    expect(
      buildTopology(source({ systemType: 'standalone_all_in_one' })).inverters[0]?.chargeController,
    ).toBeNull();
  });

  it('signale la répartition des chaînes quand elle n’est pas dictée par le calcul', () => {
    const many = buildTopology(source({ sizing: sizing({ inverter: { count: 2, requiredPowerKw: 8, obtainedPowerKw: 8, marginRatio: 0.1 } }) }));
    expect(many.issues.some((issue) => issue.level === 'info' && issue.message.includes('réparties'))).toBe(true);
    expect(many.inverters).toHaveLength(2);
  });

  it('porte la mention « à définir » plutôt qu’un calibre inventé', () => {
    const blank = protections.map((item) => ({ ...item, caliberA: null }));
    const topology = buildTopology(source({ protections: blank }));
    expect(topology.inverters[0]?.dcSwitch?.ratingA).toBeNull();
    expect(topology.issues.some((issue) => issue.level === 'warning')).toBe(true);
    expect(generateSingleLineDiagram(source({ protections: blank })).svg).toContain('à définir');
  });

  it('déclare une erreur quand le dimensionnement n’est pas validé', () => {
    const topology = buildTopology(source({ sizing: sizing({ valid: false }) }));
    expect(topology.issues.some((issue) => issue.level === 'error')).toBe(true);
  });
});

describe('planche', () => {
  it('adapte ses dimensions à la configuration', () => {
    const small = generateSingleLineDiagram(source()).plan;
    const large = generateSingleLineDiagram(
      source({ sizing: sizing({ pv: { ...sizing().pv, stringsInParallel: 9, modulesInSeries: 22, totalModules: 198 } }) }),
    ).plan;
    expect(large.width).toBeGreaterThan(small.width);
  });

  it('retire la dérivation batterie quand il n’y a pas de stockage', () => {
    const withBank = generateSingleLineDiagram(source()).plan;
    const without = generateSingleLineDiagram(source({ systemType: 'grid_tied' })).plan;
    expect(withBank.symbols.some((item) => item.kind === 'battery')).toBe(true);
    expect(without.symbols.some((item) => item.kind === 'battery')).toBe(false);
  });

  it('porte un cadre de repérage et y situe chaque appareil de la nomenclature', () => {
    const { plan } = generateSingleLineDiagram(source());
    expect(plan.grid).not.toBeNull();
    const breaker = plan.bom.find((row) => row.reference === 'Q1');
    expect(breaker?.gridRef).toMatch(/^[A-Z]\d+$/);
  });

  it('partage ses repères entre le plan et la nomenclature', () => {
    const { plan } = generateSingleLineDiagram(source());
    const drawn = new Set(plan.symbols.map((item) => item.reference).filter(Boolean));
    for (const row of plan.bom) {
      // Le champ PV est repéré par son cadre, tous les autres par un symbole.
      if (row.reference === 'G1') continue;
      expect(drawn.has(row.reference)).toBe(true);
    }
    expect(plan.bom.every((row) => row.gridRef !== '')).toBe(true);
  });

  it('retient la plus petite planche normalisée qui reste lisible', () => {
    const auto = generateSingleLineDiagram(source()).plan;
    expect(auto.smallestTextPt).toBeGreaterThanOrEqual(6);

    // La planche retenue est bien la plus petite : celle qui la précède dans la
    // gamme ne suffirait pas. Sans quoi « automatique » voudrait dire « la plus grande ».
    const index = SHEETS.findIndex((sheet) => sheet.format === auto.format);
    expect(index).toBeGreaterThanOrEqual(0);
    for (const smaller of SHEETS.slice(0, index)) {
      const pinned = generateSingleLineDiagram(source({ options: { format: smaller.format } })).plan;
      expect(pinned.smallestTextPt).toBeLessThan(6);
    }
  });

  it('alerte, sans rien masquer, quand l’appelant impose une planche trop petite', () => {
    const pinned = generateSingleLineDiagram(source({ options: { format: 'a4-portrait' } })).plan;
    expect(pinned.format).toBe('a4-portrait');
    expect(pinned.smallestTextPt).toBeLessThan(6);
    const warning = pinned.issues.find((issue) => issue.message.includes('pt'));
    expect(warning?.level).toBe('warning');
    // L'alerte nomme le remède plutôt que de laisser l'utilisateur chercher.
    expect(warning?.message).toMatch(/A[234] (portrait|paysage)|synoptique/);
  });

  it('mesure la lisibilité sur la hauteur autant que sur la largeur', () => {
    // Un plan haut et étroit tient en largeur mais pas en hauteur : le mesurer
    // sur la seule largeur le déclarerait lisible à tort.
    const tall = generateSingleLineDiagram(
      source({
        options: { format: 'a4-landscape' },
        sizing: sizing({ pv: { ...sizing().pv, modulesInSeries: 24, stringsInParallel: 1, totalModules: 24 } }),
      }),
    ).plan;
    expect(tall.height).toBeGreaterThan(tall.width);
    expect(tall.smallestTextPt).toBeLessThan(6);
  });

  it('condense le champ en synoptique portrait', () => {
    const full = generateSingleLineDiagram(source()).plan;
    const synoptic = generateSingleLineDiagram(source({ options: SYNOPTIC_OPTIONS })).plan;
    expect(synoptic.width).toBeLessThan(full.width);
    expect(synoptic.grid).toBeNull();
    expect(synoptic.symbols.filter((item) => item.kind === 'pv-module').length).toBeLessThan(
      full.symbols.filter((item) => item.kind === 'pv-module').length,
    );
  });
});

describe('rendu', () => {
  it('est déterministe au caractère près', () => {
    expect(generateSingleLineDiagram(source()).svg).toBe(generateSingleLineDiagram(source()).svg);
  });

  it('produit un SVG autonome et dimensionné', () => {
    const { svg, plan } = generateSingleLineDiagram(source());
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${plan.width} ${plan.height}"`);
    expect(svg.trimEnd().endsWith('</svg>')).toBe(true);
  });

  it('échappe le contenu du cartouche', () => {
    const { svg } = generateSingleLineDiagram(
      source({ title: { ...source().title, client: 'Dupont & <Fils>' } }),
    );
    expect(svg).toContain('Dupont &amp; &lt;Fils&gt;');
    expect(svg).not.toContain('<Fils>');
  });

  it('n’écrit aucun littéral français quand on lui passe le dictionnaire anglais', () => {
    const { svg } = generateSingleLineDiagram(source({ labels: EN_LABELS }));
    expect(svg).toContain('PV array');
    expect(svg).toContain('Legend');
    expect(svg).not.toContain('Champ PV');
  });
});
