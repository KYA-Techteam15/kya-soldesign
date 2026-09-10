import type { Equipment } from '@ksd/catalog';
import type { FinanceOutputV1, SizingOutputV1 } from '@ksd/engine';
import type { BillOfMaterialRow } from '@ksd/diagram';
import type { CableSegment, ProjectViewModel } from '../models/projectView';
import type { ApplicationSettingsV2 } from '../models/applicationSettings';
import { dateFr, fmt } from '../../domain/format';
import { projectProtections } from '../diagram/projectDiagram';

/**
 * Modèle de document.
 *
 * Le rapport imprimé et le rapport Word doivent dire la même chose : cette
 * structure est la description commune, indépendante du support. `ReportA4`
 * la rend en HTML pour l'impression, `docxWriter` en OOXML pour Word.
 */

export type DocKind = 'rapport' | 'offre' | 'proforma' | 'dossier_exec';

export type Block =
  | {
      readonly kind: 'cover';
      readonly docKind: string;
      readonly project: string;
      readonly subtitle: string;
      readonly system: string;
      readonly sri: string;
      readonly cells: readonly { label: string; value: string }[];
      /** URLs d'objet des visuels choisis dans les réglages, s'il y en a. */
      readonly logoUrl: string | null;
      readonly coverUrl: string | null;
    }
  | { readonly kind: 'title'; readonly text: string; readonly subtitle: string }
  | { readonly kind: 'heading'; readonly text: string }
  | { readonly kind: 'meta'; readonly items: readonly { label: string; value: string; note: string }[] }
  | { readonly kind: 'headline'; readonly label: string; readonly text: string; readonly sealValue: string; readonly sealLabel: string }
  | {
      readonly kind: 'table';
      readonly head: readonly string[];
      readonly rows: readonly (readonly string[])[];
      readonly numeric: readonly number[];
      readonly emphasis: readonly number[];
    }
  | { readonly kind: 'kpis'; readonly items: readonly { label: string; value: string; unit: string }[] }
  | { readonly kind: 'paragraph'; readonly label: string; readonly text: string }
  | { readonly kind: 'image'; readonly svg: string; readonly widthPx: number; readonly heightPx: number; readonly caption: string }
  | { readonly kind: 'signature'; readonly left: string; readonly right: string };

export interface DocSection {
  readonly orientation: 'portrait' | 'landscape';
  readonly blocks: readonly Block[];
}

export interface ReportDocument {
  readonly fileName: string;
  readonly title: string;
  readonly company: { readonly name: string; readonly contact: string };
  readonly footer: string;
  readonly sections: readonly DocSection[];
}

const TITLE_KEYS: Record<DocKind, [string, string]> = {
  rapport: ['report.title.rapport', 'report.subtitle.rapport'],
  offre: ['report.title.offre', 'report.subtitle.offre'],
  proforma: ['report.title.proforma', 'report.subtitle.proforma'],
  dossier_exec: ['report.title.execution', 'report.subtitle.execution'],
};
const SEGMENT_KEYS: Record<CableSegment, string> = {
  pv_inverter: 'report.segment.pvInverter',
  inverter_battery: 'report.segment.inverterBattery',
  inverter_load: 'report.segment.inverterLoad',
};

const item = (list: readonly Equipment[], id: string | null) => list.find((equipment) => equipment.id === id);
const name = (equipment: Equipment | undefined) => (equipment ? `${equipment.manufacturer} · ${equipment.model}` : '—');
const dash = (value: string | number | undefined | null): string =>
  value === undefined || value === null || value === '' ? '—' : String(value);

export interface ReportModelInput {
  readonly project: ProjectViewModel;
  readonly kind: DocKind;
  readonly sizing: SizingOutputV1 | null;
  readonly finance: FinanceOutputV1 | null;
  readonly catalog: readonly Equipment[];
  readonly settings: ApplicationSettingsV2;
  readonly t: (key: string) => string;
  /** Planche unifilaire, absente tant que le dimensionnement n'est pas fait. */
  readonly diagram: { readonly svg: string; readonly width: number; readonly height: number; readonly bom: readonly BillOfMaterialRow[] } | null;
  /** Visuels de couverture résolus par l'appelant depuis les réglages. */
  readonly assets?: { readonly logoUrl: string | null; readonly coverUrl: string | null };
}

/** Construit le document, dans le même ordre et avec les mêmes chiffres que `ReportA4`. */
export function buildReportDocument(input: ReportModelInput): ReportDocument {
  const { project, kind, sizing, finance, catalog, settings, t, diagram } = input;
  const details = project.details;
  const money = project.currency;
  const [titleKey, subtitleKey] = TITLE_KEYS[kind];
  const title = t(titleKey);

  const mod = item(catalog, project.selection.moduleId);
  const bat = item(catalog, project.selection.batteryId);
  const inv = item(catalog, project.selection.inverterId);
  const profile = project.load.profiles.find((candidate) => candidate.id === project.load.activeProfileId);
  const rows = profile ? [...profile.classic, ...profile.inductive] : [];
  const daily = rows.reduce((total, row) => total + row.qty * row.unitPower * row.opHours, 0);
  const real = rows.reduce((total, row) => total + row.qty * row.unitPower * (row.yield ?? 1) * (row.simultaneity ?? 1), 0);
  const peak = rows.reduce((total, row) => total + row.qty * row.unitPower, 0);
  const sim = finance?.simulation;
  const life = finance?.lifecycle;

  const page1: Block[] = [
    { kind: 'title', text: title, subtitle: t(subtitleKey) },
    {
      kind: 'meta',
      items: [
        { label: t('report.client'), value: dash(details.clientName), note: details.clientTel || details.clientEmail || '' },
        { label: t('report.project'), value: project.name, note: `n° ${dash(details.projectNumber)} · ${details.applicationType}` },
        {
          label: t('report.site'),
          value: `${dash(project.site.region)}, ${dash(project.site.country)}`,
          note: `${fmt(project.site.latitude, 4)} · ${fmt(project.site.longitude, 4)}`,
        },
        {
          label: t('report.solarResource'),
          value: `${fmt(project.site.irradiation, 2)} kWh/m²/j`,
          note: `${t('report.tilt')} ${fmt(project.site.tilt, 0)}° · ${t('report.azimuth')} ${fmt(project.site.azimuth, 0)}°`,
        },
      ],
    },
    {
      kind: 'headline',
      label: t('report.selectedSystem'),
      text: sizing
        ? `${fmt(sizing.pv.obtainedPowerKwc, 2)} kWc · ${fmt(sizing.battery.usefulEnergyKwh, 2)} kWh ${t('report.useful')} · ${fmt(sizing.inverter.obtainedPowerKw, 2)} kW ${t('report.inverter')}`
        : t('report.sizingUnavailable'),
      sealValue: sim ? fmt(sim.sri, 2) : '—',
      sealLabel: 'SRI',
    },
    { kind: 'heading', text: t('report.siteNeeds') },
    {
      kind: 'table',
      head: [t('report.item'), t('report.quantity'), t('report.calledPower'), t('report.energyPerDay')],
      numeric: [1, 2, 3],
      emphasis: [rows.slice(0, 12).length],
      rows: [
        ...rows.slice(0, 12).map((row) => [
          row.name,
          fmt(row.qty),
          fmt(row.qty * row.unitPower * (row.yield ?? 1) * (row.simultaneity ?? 1)),
          fmt(row.qty * row.unitPower * row.opHours),
        ]),
        [t('report.total'), fmt(rows.reduce((total, row) => total + row.qty, 0)), fmt(real), fmt(daily)],
        [t('report.peakPower'), '', '', `${fmt(peak)} W`],
      ],
    },
    { kind: 'heading', text: t('report.recommendedSystem') },
    {
      kind: 'table',
      head: [t('report.component'), t('report.reference'), t('report.configuration'), t('report.quantity'), t('report.obtained')],
      numeric: [3, 4],
      emphasis: [],
      rows: [
        [
          `${t('report.pvModules')} — ${name(mod)}`,
          dash(mod?.id),
          sizing ? `${sizing.pv.modulesInSeries} S × ${sizing.pv.stringsInParallel} P` : '—',
          dash(sizing?.pv.totalModules),
          sizing ? `${fmt(sizing.pv.obtainedPowerKwc, 2)} kWc` : '—',
        ],
        [
          `${t('report.batteryBank')} — ${name(bat)}`,
          dash(bat?.id),
          sizing ? `${sizing.battery.unitsInSeries} S × ${sizing.battery.stringsInParallel} P` : '—',
          dash(sizing?.battery.totalUnits),
          sizing ? `${fmt(sizing.battery.usefulEnergyKwh, 2)} kWh ${t('report.useful')}` : '—',
        ],
        [
          `${t('report.inverters')} — ${name(inv)}`,
          dash(inv?.id),
          t('report.parallel'),
          dash(sizing?.inverter.count),
          sizing ? `${fmt(sizing.inverter.obtainedPowerKw, 2)} kW` : '—',
        ],
      ],
    },
    { kind: 'heading', text: t('report.expectedPerformance') },
    {
      kind: 'kpis',
      items: [
        { label: t('report.annualProduction'), value: sim ? fmt(sim.annualProductionKwh) : '—', unit: 'kWh' },
        { label: t('report.lcoe'), value: life ? fmt(life.lcoeActualized, 1) : '—', unit: `${money}/kWh` },
        { label: 'SVI', value: life ? fmt(life.svi, 2) : '—', unit: '/ 1' },
        { label: t('report.co2'), value: life ? fmt(life.co2AvoidedKg / 1000, 1) : '—', unit: t('unit.tonnes') },
      ],
    },
  ];

  const protectionRows = buildProtectionRows(project, sizing, catalog, t);

  const page2: Block[] = [
    { kind: 'heading', text: t('report.protectionsAndCables') },
    {
      kind: 'table',
      head: [t('report.segment'), t('report.protection'), t('report.current'), t('report.caliber'), t('report.cableSection'), t('report.length')],
      numeric: [2, 3, 4, 5],
      emphasis: [],
      rows: protectionRows,
    },
    { kind: 'heading', text: t('report.financialAssessment') },
    {
      kind: 'table',
      head: [t('report.item'), t('report.quantity'), t('report.unitPrice'), t('report.totalExclTax')],
      numeric: [1, 2, 3],
      emphasis: finance ? [finance.lines.length, finance.lines.length + 2] : [],
      rows: [
        ...(finance?.lines ?? []).map((line) => [line.label, fmt(line.quantity), fmt(line.unitSale), fmt(line.totalSale)]),
        [t('report.totalExclTax'), '', '', finance ? fmt(finance.totalSaleHt) : '—'],
        [`${t('report.vat')} ${fmt(project.costing.tvaPercent, 1)} %`, '', '', finance ? fmt(finance.vatAmount) : '—'],
        [t('report.totalInclTax'), '', '', finance ? fmt(finance.totalTtc) : '—'],
        [`${t('report.downPayment')} · ${fmt(project.costing.downPaymentPercent, 1)} %`, '', '', finance ? fmt(finance.downPayment) : '—'],
        [t('report.balance'), '', '', finance ? fmt(finance.balanceDue) : '—'],
      ],
    },
    { kind: 'heading', text: t('report.economicIndicators') },
    {
      kind: 'kpis',
      items: [
        { label: t('report.wpPrice'), value: finance ? fmt(finance.wattPeakPrice) : '—', unit: `${money}/Wc` },
        { label: t('report.margin'), value: finance ? fmt(finance.averageMarginRatio * 100, 1) : '—', unit: '%' },
        { label: t('report.lifecycle'), value: life ? fmt(life.actualizedLifecycleCost / 1e6, 2) : '—', unit: `M${money}` },
        { label: t('report.maintenance'), value: life ? fmt(life.annualMaintenanceCost) : '—', unit: `${money}/an` },
      ],
    },
    { kind: 'heading', text: t('report.conditions') },
    { kind: 'paragraph', label: `${t('report.validity')} :`, text: `${fmt(project.costing.offerValidity)} ${t('report.days')} ${t('report.from')} ${dateFr(details.projectDate)}.` },
    { kind: 'paragraph', label: `${t('report.delivery')} :`, text: `${fmt(project.costing.deliveryTime)} ${t('report.days')} ${t('report.afterDeposit')}.` },
    { kind: 'paragraph', label: `${t('report.warranty')} :`, text: `${fmt(project.costing.productWarranty)} ${t('report.months')}.` },
    { kind: 'paragraph', label: `${t('report.studyDuration')} :`, text: `${fmt(project.assumptions.projectLifetime)} ${t('report.years')} · ${t('report.discountRate')} ${fmt(project.assumptions.actualizationRate, 1)} %.` },
    { kind: 'paragraph', label: `${t('report.gridReference')} :`, text: `${fmt(project.assumptions.lcoeGrid, 1)} ${money}/kWh · ${t('report.emissionFactor')} ${fmt(project.assumptions.emissionFactor, 2)} kgCO₂/kWh.` },
    { kind: 'signature', left: `${settings.company.name || 'KYA-SolDesign'} — ${dash(details.followerName)}`, right: t('report.forClient') },
  ];

  const cover: Block = {
    kind: 'cover',
    docKind: title,
    project: project.name,
    subtitle: `${t(subtitleKey)} · n° ${dash(details.projectNumber)}`,
    system: sizing
      ? `${fmt(sizing.pv.obtainedPowerKwc, 2)} kWc · ${fmt(sizing.battery.usefulEnergyKwh, 2)} kWh ${t('report.useful')} · ${fmt(sizing.inverter.obtainedPowerKw, 2)} kW`
      : t('report.sizingUnavailable'),
    sri: sim ? fmt(sim.sri, 2) : '—',
    cells: [
      { label: t('report.client'), value: dash(details.clientName) },
      { label: t('report.site'), value: dash(details.projectLocation || project.site.region) },
      { label: t('report.follower'), value: dash(details.followerName) },
      { label: t('report.editedOn'), value: dateFr(details.projectDate) },
    ],
    logoUrl: input.assets?.logoUrl ?? null,
    coverUrl: input.assets?.coverUrl ?? null,
  };

  const sections: DocSection[] = [
    { orientation: 'portrait', blocks: [cover] },
    { orientation: 'portrait', blocks: page1 },
    { orientation: 'portrait', blocks: page2 },
  ];

  // La proforma est une pièce comptable : la planche n'y a pas sa place.
  if (diagram && kind !== 'proforma') {
    // La planche complète demande une page couchée ; le synoptique tient debout.
    const landscape = kind === 'dossier_exec';
    const blocks: Block[] = [
      { kind: 'heading', text: t('report.singleLine') },
      {
        kind: 'image',
        svg: diagram.svg,
        widthPx: diagram.width,
        heightPx: diagram.height,
        caption: `${project.name} — ${dash(details.projectNumber)}`,
      },
    ];
    if (landscape && diagram.bom.length > 0) {
      blocks.push({ kind: 'heading', text: t('report.billOfMaterial') });
      blocks.push({
        kind: 'table',
        head: [t('report.bomReference'), t('report.bomDesignation'), t('report.bomCharacteristic'), t('report.quantity'), t('report.bomLocation')],
        numeric: [3],
        emphasis: [],
        rows: diagram.bom.map((row) => [row.reference, row.designation, row.characteristic, fmt(row.quantity), row.gridRef]),
      });
    }
    sections.push({ orientation: landscape ? 'landscape' : 'portrait', blocks });
  }

  const contact = [settings.company.address, settings.company.phone, settings.company.email].filter(Boolean).join(' · ');

  return {
    fileName: `${slug(project.name)}-${kind}.docx`,
    title,
    company: { name: settings.company.name || 'KYA-SolDesign', contact },
    footer: settings.reports.footerText.trim() || `${settings.company.name || 'KYA-SolDesign'} · ${title}`,
    sections,
  };
}

function buildProtectionRows(
  project: ProjectViewModel,
  sizing: SizingOutputV1 | null,
  catalog: readonly Equipment[],
  t: (key: string) => string,
): string[][] {
  if (!sizing) return [];
  const { protections, cables } = projectProtections(project, sizing, catalog);
  return protections.map((protection) => {
    const cable = project.cables.find((choice) => choice.segment === protection.segment);
    const result = cables.find((choice) => choice.segment === protection.segment);
    return [
      t(SEGMENT_KEYS[protection.segment]),
      protection.kind,
      `${fmt(protection.requiredA, 1)} A`,
      protection.caliberA === null ? '—' : `${fmt(protection.caliberA, 1)} A`,
      result && result.state === 'valid' ? `${fmt(result.normalizedSection, 1)} mm²` : '—',
      cable ? `${fmt(cable.length, 1)} m` : '—',
    ];
  });
}

const slug = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'projet';
