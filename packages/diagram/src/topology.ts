import type { CableSizingResult, ProtectionSizingResult, SizingOutputV1 } from '@ksd/engine';
import type {
  AcLineSpec,
  BatteryBankSpec,
  CableSpec,
  DiagramOptions,
  EarthNetworkSpec,
  InverterUnitSpec,
  MpptInputSpec,
  ProtectionSpec,
  PvStringSpec,
  SingleLineTopology,
  TitleBlock,
  TopologyIssue,
} from './contracts.js';
import type { DiagramLabels } from './labels.js';
import { FR_LABELS } from './labels.js';

/**
 * Traduction du dimensionnement en architecture d'installation.
 *
 * C'est ici, et nulle part ailleurs, que le type de système décide de la forme
 * de l'installation. Le placement, les symboles et le rendu n'en savent rien.
 */

/** Les topologies couvertes, dans les deux orthographes présentes au dépôt. */
export type DiagramSystemType =
  | 'standalone_all_in_one'
  | 'standalone_inverter_controller'
  | 'grid_tied'
  | 'pv_diesel'
  | 'solar_water_pumping'
  | 'solar_street_light'
  | 'standalone-all-in-one'
  | 'standalone-controller-inverter'
  | 'grid-tied'
  | 'pv-diesel'
  | 'solar-pumping'
  | 'solar-street-lighting'
  | 'undefined';

type Normalized =
  | 'standalone-all-in-one'
  | 'standalone-controller-inverter'
  | 'grid-tied'
  | 'pv-diesel'
  | 'solar-pumping'
  | 'solar-street-lighting';

const NORMALIZE: Readonly<Record<string, Normalized>> = {
  standalone_all_in_one: 'standalone-all-in-one',
  'standalone-all-in-one': 'standalone-all-in-one',
  standalone_inverter_controller: 'standalone-controller-inverter',
  'standalone-controller-inverter': 'standalone-controller-inverter',
  grid_tied: 'grid-tied',
  'grid-tied': 'grid-tied',
  pv_diesel: 'pv-diesel',
  'pv-diesel': 'pv-diesel',
  solar_water_pumping: 'solar-pumping',
  'solar-pumping': 'solar-pumping',
  solar_street_light: 'solar-street-lighting',
  'solar-street-lighting': 'solar-street-lighting',
};

export const DEFAULT_OPTIONS: DiagramOptions = {
  // La planche n'est pas un réglage d'affichage : c'est la plus petite feuille
  // normalisée sur laquelle ce plan-ci reste lisible. Elle se déduit du dessin.
  format: 'auto',
  detail: 'full',
  dcRepresentation: 'pair',
  maxDrawnModules: 4,
  maxDrawnStrings: 4,
  maxDrawnBatteries: 4,
  showLegend: true,
  showTitleBlock: true,
  showGridFrame: true,
};

/** Gabarit portrait condensé, pour le rapport et l'offre. */
export const SYNOPTIC_OPTIONS: DiagramOptions = {
  ...DEFAULT_OPTIONS,
  format: 'a4-portrait',
  detail: 'synoptic',
  showGridFrame: false,
};

export interface ModuleSnapshot {
  readonly powerW: number | null;
  readonly vocV: number | null;
  readonly iscA: number | null;
  readonly product: string | null;
}

export interface BatterySnapshot {
  readonly voltageV: number | null;
  readonly capacityAh: number | null;
  readonly product: string | null;
}

export interface InverterSnapshot {
  readonly acVoltageV: number | null;
  readonly product: string | null;
}

/** Tout ce dont la topologie a besoin, rassemblé par l'appelant. */
export interface TopologySource {
  readonly systemType: DiagramSystemType;
  readonly sizing: SizingOutputV1;
  readonly protections: readonly ProtectionSizingResult[];
  readonly cables: readonly CableSizingResult[];
  /** Longueur retenue par segment, saisie à l'étape « Protections et câbles ». */
  readonly cableLengthsM: Readonly<Partial<Record<CableSizingResult['segment'], number>>>;
  readonly module: ModuleSnapshot | null;
  readonly battery: BatterySnapshot | null;
  readonly inverter: InverterSnapshot | null;
  readonly title: TitleBlock;
  readonly labels?: DiagramLabels;
  readonly options?: Partial<DiagramOptions>;
}

const positive = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

/**
 * Répartit `count` chaînes sur `groups` onduleurs. Le reste est versé sur les
 * premiers onduleurs : la répartition reste stable d'un calcul à l'autre.
 */
export function spread(count: number, groups: number): number[] {
  if (groups <= 0) return [];
  const base = Math.floor(count / groups);
  const remainder = count % groups;
  return Array.from({ length: groups }, (_, index) => base + (index < remainder ? 1 : 0));
}

function findProtection(
  protections: readonly ProtectionSizingResult[],
  segment: ProtectionSizingResult['segment'],
): ProtectionSizingResult | null {
  return protections.find((item) => item.segment === segment) ?? null;
}

function findCable(
  cables: readonly CableSizingResult[],
  lengths: TopologySource['cableLengthsM'],
  segment: CableSizingResult['segment'],
  conductors: number,
): CableSpec | null {
  const found = cables.find((item) => item.segment === segment);
  if (!found || found.state !== 'valid') return null;
  return {
    conductors,
    sectionMm2: positive(found.normalizedSection),
    currentA: positive(found.currentA),
    lengthM: positive(lengths[segment] ?? null),
  };
}

function toProtectionSpec(
  reference: string,
  result: ProtectionSizingResult | null,
  fallbackKind: string,
): ProtectionSpec | null {
  if (!result) return null;
  return {
    reference,
    kind: result.selectedType ?? result.kind ?? fallbackKind,
    ratingA: positive(result.caliberA),
    voltageV: positive(result.serviceVoltageV),
    quantity: Math.max(1, result.quantity),
  };
}

/** Construit l'architecture de l'installation à partir du dimensionnement. */
export function buildTopology(source: TopologySource): SingleLineTopology {
  const options: DiagramOptions = { ...DEFAULT_OPTIONS, ...source.options };
  const labels = source.labels ?? FR_LABELS;
  const kind = NORMALIZE[source.systemType] ?? 'standalone-controller-inverter';
  const issues: TopologyIssue[] = [];
  const { sizing } = source;

  const inverterCount = Math.max(1, Math.round(sizing.inverter.count));
  const totalStrings = Math.max(1, Math.round(sizing.pv.stringsInParallel));
  const modulesInSeries = Math.max(1, Math.round(sizing.pv.modulesInSeries));
  const distribution = spread(totalStrings, inverterCount);

  if (inverterCount > 1) {
    issues.push({
      level: 'info',
      message:
        `Les ${totalStrings} chaînes sont réparties sur ${inverterCount} onduleurs (${distribution.join(' + ')}). ` +
        'Le dimensionnement ne fixe pas cette répartition.',
    });
  }

  const pvProtection = findProtection(source.protections, 'pv_inverter');
  const batteryProtection = findProtection(source.protections, 'inverter_battery');
  const loadProtection = findProtection(source.protections, 'inverter_load');

  if (pvProtection && pvProtection.caliberA === null) {
    issues.push({
      level: 'warning',
      message: `Calibre de la protection PV non retenu : le schéma porte la mention « ${labels.toBeDefined} ».`,
    });
  }

  const moduleVoc = positive(source.module?.vocV ?? null);
  const moduleIsc = positive(source.module?.iscA ?? null);
  const stringVocCold =
    positive(sizing.pv.vocColdV) ?? (moduleVoc === null ? null : moduleVoc * modulesInSeries);

  const hasSeparateController = kind === 'standalone-controller-inverter';
  const hasBattery = kind !== 'grid-tied' && kind !== 'solar-pumping';

  let stringCursor = 0;
  const inverters: InverterUnitSpec[] = distribution.map((stringCount, index) => {
    const strings: PvStringSpec[] = Array.from({ length: Math.max(1, stringCount) }, () => {
      stringCursor += 1;
      return {
        reference: `S${stringCursor}`,
        modules: modulesInSeries,
        vocColdV: stringVocCold,
        iscA: moduleIsc ?? positive(sizing.pv.iscA),
      };
    });

    const input: MpptInputSpec = { reference: `MPPT ${index + 1}`, strings };

    return {
      id: `inverter-${index + 1}`,
      reference: `O${index + 1}`,
      powerKw: positive(sizing.inverter.obtainedPowerKw),
      product: source.inverter?.product ?? null,
      inputs: [input],
      chargeController: hasSeparateController
        ? {
            reference: `R${index + 1}`,
            kind: labels.chargeController,
            ratingA: null,
            voltageV: positive(sizing.battery.bankVoltageV),
            quantity: 1,
          }
        : null,
      stringFuse:
        strings.length > 1
          ? {
              reference: `F${index + 1}`,
              kind: labels.stringFuse,
              // Le calibre est celui choisi en « Protections » ; sans choix, « à choisir ».
              ratingA: pvProtection?.selectedType === 'Fusible gPV' ? positive(pvProtection.caliberA) : null,
              voltageV: stringVocCold,
              quantity: strings.length * 2,
            }
          : null,
      combiner: strings.length > 1,
      dcSpd: {
        reference: `PF${index + 1}`,
        kind: labels.spdType2,
        ratingA: null,
        voltageV: stringVocCold,
        quantity: 1,
      },
      dcSwitch: toProtectionSpec(`Q${index + 1}`, pvProtection, labels.dcSwitch),
      dcCable: findCable(source.cables, source.cableLengthsM, 'pv_inverter', 2),
    };
  });

  const battery = hasBattery
    ? buildBattery(
        sizing,
        source.battery,
        batteryProtection,
        findCable(source.cables, source.cableLengthsM, 'inverter_battery', 2),
        labels,
        issues,
      )
    : null;

  const acVoltageV = positive(source.inverter?.acVoltageV ?? null) ?? 230;
  const ac = buildAcLine(kind, acVoltageV, loadProtection, source, labels);
  const earth = buildEarth(kind);

  if (!sizing.valid) {
    issues.push({ level: 'error', message: 'Le dimensionnement n’est pas validé : le schéma est indicatif.' });
  }
  if (kind === 'solar-pumping' || kind === 'solar-street-lighting') {
    issues.push({
      level: 'info',
      message: 'Topologie spécialisée : la partie puissance est représentée, la partie métier reste à confirmer.',
    });
  }

  return {
    title: source.title,
    field: {
      totalModules: sizing.pv.totalModules,
      modulePowerW: positive(source.module?.powerW ?? null),
      powerKwc: positive(sizing.pv.obtainedPowerKwc),
      product: source.module?.product ?? null,
    },
    inverters,
    battery,
    ac,
    earth,
    options,
    issues,
  };
}

function buildAcLine(
  kind: Normalized,
  acVoltageV: number,
  loadProtection: ProtectionSizingResult | null,
  source: TopologySource,
  labels: DiagramLabels,
): AcLineSpec {
  const gridConnected = kind === 'grid-tied';
  const dieselBacked = kind === 'pv-diesel';
  const loadKind = kind === 'solar-pumping' ? 'pump' : kind === 'solar-street-lighting' ? 'street-light' : 'building';
  const loadLabel =
    loadKind === 'pump' ? labels.loadPump : loadKind === 'street-light' ? labels.loadStreetLight : labels.loadBuilding;

  return {
    breaker: toProtectionSpec('Q10', loadProtection, labels.acBreaker),
    spd: {
      reference: 'PF10',
      kind: labels.acSpd,
      ratingA: null,
      voltageV: acVoltageV,
      quantity: 1,
    },
    rcd:
      loadKind === 'street-light'
        ? null
        : {
            reference: 'Q11',
            kind: labels.rcd,
            ratingA: positive(loadProtection?.caliberA ?? null),
            voltageV: acVoltageV,
            quantity: 1,
          },
    voltageV: acVoltageV,
    cable: findCable(source.cables, source.cableLengthsM, 'inverter_load', loadKind === 'building' ? 3 : 2),
    meter: gridConnected,
    transferSwitch:
      gridConnected || dieselBacked
        ? { reference: 'Q12', kind: labels.transferSwitch, ratingA: null, voltageV: acVoltageV, quantity: 1 }
        : null,
    grid: gridConnected ? { label: labels.grid, voltageV: acVoltageV } : null,
    generator: dieselBacked ? { label: labels.generator, powerKw: null } : null,
    loadKind,
    loadLabel,
  };
}

/**
 * Réseau de terre. La barrette de coupure n'est pas décorative : sans elle, la
 * résistance de la prise de terre n'est pas mesurable après mise en service.
 */
function buildEarth(kind: Normalized): EarthNetworkSpec {
  return {
    enabled: true,
    mainSectionMm2: 16,
    electrodeSectionMm2: 25,
    cutoffLink: kind !== 'solar-street-lighting',
  };
}

function buildBattery(
  sizing: SizingOutputV1,
  snapshot: BatterySnapshot | null,
  protection: ProtectionSizingResult | null,
  cable: CableSpec | null,
  labels: DiagramLabels,
  issues: TopologyIssue[],
): BatteryBankSpec | null {
  const totalUnits = Math.round(sizing.battery.totalUnits);
  if (!totalUnits || totalUnits <= 0) return null;

  const unitsInSeries = Math.max(1, Math.round(sizing.battery.unitsInSeries));
  const stringsInParallel = Math.max(1, Math.round(sizing.battery.stringsInParallel));

  if (unitsInSeries * stringsInParallel !== totalUnits) {
    issues.push({
      level: 'warning',
      message: `Le parc annoncé (${totalUnits} unités) ne correspond pas à la matrice ${unitsInSeries}S × ${stringsInParallel}P.`,
    });
  }

  return {
    unitsInSeries,
    stringsInParallel,
    totalUnits,
    unitVoltageV: positive(snapshot?.voltageV ?? null),
    unitCapacityAh: positive(snapshot?.capacityAh ?? null),
    bankVoltageV: positive(sizing.battery.bankVoltageV),
    usefulEnergyKwh: positive(sizing.battery.usefulEnergyKwh),
    product: snapshot?.product ?? null,
    breaker: toProtectionSpec('Q20', protection, labels.batteryBreaker),
    cable,
  };
}
