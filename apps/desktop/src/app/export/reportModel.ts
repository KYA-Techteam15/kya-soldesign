import type { Equipment } from '@ksd/catalog';
import type { FinanceOutputV1, PresizingOutputV1, SizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { BillOfMaterialRow } from '@ksd/diagram';
import type { CableSegment, ProjectViewModel } from '../models/projectView';
import type { ApplicationSettingsV2 } from '../models/applicationSettings';
import { dateFr, fmt } from '../../domain/format';
import { projectProtections } from '../diagram/projectDiagram';
import { buildReportLoadSummary, type ReportLoadSummary } from './reportLoadSummary.js';
import {
  defaultReportOptions,
  resolveSections,
  type DocKind,
  type ReportOptions,
  type SectionId,
} from './documentComposition.js';

/**
 * Modèle de document.
 *
 * Le rapport imprimé et le rapport Word doivent dire la même chose : cette
 * structure est la description commune, indépendante du support. `ReportA4`
 * la rend en HTML pour l'impression, `docxWriter` en OOXML pour Word.
 *
 * Chaque section est construite séparément ; c'est la carte de composition qui
 * décide lesquelles entrent dans quelle pièce, et dans quel ordre.
 */

export type { DocKind };

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
  | { readonly kind: 'checklist'; readonly items: readonly string[] }
  | { readonly kind: 'image'; readonly svg: string; readonly widthPx: number; readonly heightPx: number; readonly caption: string }
  | { readonly kind: 'signature'; readonly left: string; readonly right: string; readonly imageUrl: string | null };

export interface DocSection {
  readonly orientation: 'portrait' | 'landscape';
  readonly blocks: readonly Block[];
}

export interface ReportDocument {
  readonly fileName: string;
  readonly title: string;
  readonly company: { readonly name: string; readonly contact: string };
  readonly footer: string;
  readonly watermark: string;
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
const MONTH_KEYS = [
  'month.jan', 'month.feb', 'month.mar', 'month.apr', 'month.may', 'month.jun',
  'month.jul', 'month.aug', 'month.sep', 'month.oct', 'month.nov', 'month.dec',
] as const;
const COMMISSIONING_KEYS = [
  'report.commissioning.voc', 'report.commissioning.isc', 'report.commissioning.polarity',
  'report.commissioning.insulation', 'report.commissioning.earth', 'report.commissioning.torque',
  'report.commissioning.protections', 'report.commissioning.batteryVoltage',
  'report.commissioning.inverterStart', 'report.commissioning.loadTransfer',
] as const;

const item = (list: readonly Equipment[], id: string | null) => list.find((equipment) => equipment.id === id);
const name = (equipment: Equipment | undefined) => (equipment ? `${equipment.manufacturer} · ${equipment.model}` : '—');
const dash = (value: string | number | undefined | null): string =>
  value === undefined || value === null || value === '' ? '—' : String(value);

export interface ReportModelInput {
  readonly project: ProjectViewModel;
  readonly kind: DocKind;
  readonly sizing: SizingOutputV1 | null;
  readonly finance: FinanceOutputV1 | null;
  /** Journée normalisée réellement utilisée par le moteur pour dimensionner. */
  readonly solar: SolarResourceAnalysisOutputV1 | null;
  /** Balayage (α_A, α_N) : la preuve de la méthode, pas un décor. */
  readonly presizing?: PresizingOutputV1 | null;
  readonly catalog: readonly Equipment[];
  readonly settings: ApplicationSettingsV2;
  readonly t: (key: string) => string;
  /** Planche unifilaire, absente tant que le dimensionnement n'est pas fait. */
  readonly diagram: { readonly svg: string; readonly width: number; readonly height: number; readonly bom: readonly BillOfMaterialRow[] } | null;
  /** Visuels résolus par l'appelant depuis les réglages. */
  readonly assets?: { readonly logoUrl: string | null; readonly coverUrl: string | null; readonly signatureUrl?: string | null };
  /** Choix faits au moment de générer ; à défaut, la composition par défaut. */
  readonly options?: ReportOptions;
}

/** Construit le document, dans le même ordre et avec les mêmes chiffres que `ReportA4`. */
export function buildReportDocument(input: ReportModelInput): ReportDocument {
  const { project, kind, settings, t } = input;
  const options = input.options ?? defaultReportOptions(kind, 'fr');
  const [titleKey] = TITLE_KEYS[kind];
  const title = t(titleKey);

  const retained = resolveSections(kind, options);
  const built = new Map<SectionId, readonly Block[]>();
  for (const id of retained) built.set(id, blocksFor(id, input));

  // La planche et sa nomenclature partagent une page ; en dossier d'exécution
  // elle est couchée, sinon le synoptique tient debout avec le reste.
  const plateIds: readonly SectionId[] = ['diagram', 'billOfMaterial'];
  const landscape = kind === 'dossier_exec';
  const coverBlocks = built.get('cover') ?? [];
  const bodyBlocks = retained
    .filter((id) => id !== 'cover' && !(landscape && plateIds.includes(id)))
    .flatMap((id) => built.get(id) ?? []);
  const plateBlocks = landscape ? plateIds.flatMap((id) => built.get(id) ?? []) : [];

  const sections: DocSection[] = [];
  if (coverBlocks.length > 0) sections.push({ orientation: 'portrait', blocks: coverBlocks });
  if (bodyBlocks.length > 0) sections.push({ orientation: 'portrait', blocks: bodyBlocks });
  if (plateBlocks.length > 0) sections.push({ orientation: 'landscape', blocks: plateBlocks });

  const contact = [settings.company.address, settings.company.phone, settings.company.email].filter(Boolean).join(' · ');
  const chosenName = options.fileName.trim();

  return {
    fileName: `${chosenName.length > 0 ? slug(chosenName) : `${slug(project.name)}-${kind}`}.docx`,
    title,
    company: { name: settings.company.name || 'KYA-SolDesign', contact },
    footer: settings.reports.footerText.trim() || `${settings.company.name || 'KYA-SolDesign'} · ${title}`,
    watermark: options.watermark.trim(),
    sections,
  };
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function blocksFor(id: SectionId, input: ReportModelInput): readonly Block[] {
  switch (id) {
    case 'cover': return [coverBlock(input)];
    case 'identity': return identityBlocks(input);
    case 'headline': return headlineBlocks(input);
    case 'siteResource': return siteResourceBlocks(input);
    case 'loadNeeds': return loadNeedsBlocks(input);
    case 'methodology': return methodologyBlocks(input);
    case 'presizing': return presizingBlocks(input);
    case 'system': return systemBlocks(input);
    case 'performance': return performanceBlocks(input);
    case 'protections': return protectionBlocks(input);
    case 'pricing': return pricingBlocks(input);
    case 'internalCosts': return internalCostBlocks(input);
    case 'economics': return economicsBlocks(input);
    case 'conditions': return conditionBlocks(input);
    case 'payment': return paymentBlocks(input);
    case 'signature': return signatureBlocks(input);
    case 'diagram': return diagramBlocks(input);
    case 'billOfMaterial': return billOfMaterialBlocks(input);
    case 'commissioning': return commissioningBlocks(input);
  }
}

function coverBlock({ project, kind, sizing, finance, t, assets }: ReportModelInput): Block {
  const details = project.details;
  const [titleKey, subtitleKey] = TITLE_KEYS[kind];
  return {
    kind: 'cover',
    docKind: t(titleKey),
    project: project.name,
    subtitle: `${t(subtitleKey)} · n° ${dash(details.projectNumber)}`,
    system: sizing
      ? `${fmt(sizing.pv.obtainedPowerKwc, 2)} kWc · ${fmt(sizing.battery.usefulEnergyKwh, 2)} kWh ${t('report.useful')} · ${fmt(sizing.inverter.obtainedPowerKw, 2)} kW`
      : t('report.sizingUnavailable'),
    sri: finance ? fmt(finance.simulation.sri, 2) : '—',
    cells: [
      { label: t('report.client'), value: dash(details.clientName) },
      { label: t('report.site'), value: dash(details.projectLocation || project.site.region) },
      { label: t('report.follower'), value: dash(details.followerName) },
      { label: t('report.editedOn'), value: dateFr(details.projectDate) },
    ],
    logoUrl: assets?.logoUrl ?? null,
    coverUrl: assets?.coverUrl ?? null,
  };
}

function identityBlocks({ project, kind, t }: ReportModelInput): readonly Block[] {
  const details = project.details;
  const [titleKey, subtitleKey] = TITLE_KEYS[kind];
  return [
    { kind: 'title', text: t(titleKey), subtitle: t(subtitleKey) },
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
  ];
}

function headlineBlocks({ sizing, finance, t }: ReportModelInput): readonly Block[] {
  return [{
    kind: 'headline',
    label: t('report.selectedSystem'),
    text: sizing
      ? `${fmt(sizing.pv.obtainedPowerKwc, 2)} kWc · ${fmt(sizing.battery.usefulEnergyKwh, 2)} kWh ${t('report.useful')} · ${fmt(sizing.inverter.obtainedPowerKw, 2)} kW ${t('report.inverter')}`
      : t('report.sizingUnavailable'),
    sealValue: finance ? fmt(finance.simulation.sri, 2) : '—',
    sealLabel: 'SRI',
  }];
}

/**
 * Ressource du site.
 *
 * L'irradiation mensuelle est calculée dès l'étape « Site » et n'était
 * imprimée nulle part : le client recevait une puissance crête sans le gisement
 * qui la justifie.
 */
function siteResourceBlocks({ project, solar, t }: ReportModelInput): readonly Block[] {
  const monthly = solar?.monthlyAverageDailyPoaKWhM2Day ?? project.site.monthlyIrradiation;
  const source = project.site.downloadedSource;
  const blocks: Block[] = [{ kind: 'heading', text: t('report.siteResource') }];

  if (monthly.length === 12) {
    blocks.push({
      kind: 'table',
      head: [t('report.month'), t('report.dailyIrradiation')],
      numeric: [1],
      emphasis: [],
      rows: monthly.map((value, index) => [
        t(MONTH_KEYS[index]!),
        value === null || value === undefined ? '—' : fmt(value, 2),
      ]),
    });
  }

  blocks.push({
    kind: 'kpis',
    items: [
      { label: t('report.annualIrradiation'), value: solar ? fmt(solar.annualPoaKWhM2, 0) : '—', unit: 'kWh/m²' },
      { label: t('report.designMonth'), value: solar?.designMonth === null || solar?.designMonth === undefined ? '—' : t(MONTH_KEYS[solar.designMonth - 1] ?? 'month.jan'), unit: '' },
      { label: t('report.tilt'), value: fmt(project.site.tilt, 0), unit: '°' },
      { label: t('report.azimuth'), value: fmt(project.site.azimuth, 0), unit: '°' },
    ],
  });

  // La provenance de la météo se remet avec le résultat : c'est ce qui rend le
  // chiffre vérifiable par un tiers.
  if (source !== null) {
    blocks.push({
      kind: 'paragraph',
      label: `${t('report.weatherSource')} :`,
      text: `${source.name} · ${source.provider} · ${source.versionOrDate}${source.sourceSha256 ? ` · SHA-256 ${source.sourceSha256.slice(0, 16)}` : ''}`,
    });
  }
  return blocks;
}

function loadNeedsBlocks(input: ReportModelInput): readonly Block[] {
  const load = buildReportLoadSummary(input.project, input.solar);
  return [{ kind: 'heading', text: input.t('report.siteNeeds') }, ...loadBlocks(load, input.t)];
}

/**
 * Hypothèses de l'étude.
 *
 * Un dimensionnement sans ses hypothèses ne se relit pas : deux bureaux
 * d'études obtiennent des résultats différents sur le même site parce qu'ils
 * n'ont pas visé la même fiabilité.
 */
function methodologyBlocks({ project, t }: ReportModelInput): readonly Block[] {
  const a = project.assumptions;
  return [
    { kind: 'heading', text: t('report.methodology') },
    { kind: 'paragraph', label: '', text: t('report.methodologyLead') },
    {
      kind: 'table',
      head: [t('report.assumption'), t('report.value')],
      numeric: [1],
      emphasis: [],
      rows: [
        [t('report.maxLpsp'), `${fmt(a.lpspMax, 1)} %`],
        [t('report.maxLolp'), `${fmt(a.lolpMax, 1)} %`],
        [t('report.performanceRatio'), `${fmt(a.systemPr, 1)} %`],
        [t('report.inverterEfficiency'), `${fmt(a.inverterYield, 1)} %`],
        [t('report.batteryEfficiency'), `${fmt(a.batteryYield, 1)} %`],
        [t('report.studyDuration'), `${fmt(a.projectLifetime, 0)} ${t('report.years')}`],
        [t('report.discountRate'), `${fmt(a.actualizationRate, 1)} %`],
        [t('report.gridReference'), `${fmt(a.lcoeGrid, 1)} ${project.currency}/kWh`],
        [t('report.emissionFactor'), `${fmt(a.emissionFactor, 2)} kgCO₂/kWh`],
      ],
    },
  ];
}

/**
 * Prédimensionnement.
 *
 * Le moteur évalue 121 couples (α_A, α_N) et n'en retenait la trace nulle
 * part : c'est pourtant l'argument de la méthode — le système retenu est le
 * moins coûteux parmi ceux qui atteignent la fiabilité visée.
 */
function presizingBlocks({ presizing, t }: ReportModelInput): readonly Block[] {
  if (presizing === null || presizing === undefined) {
    return [
      { kind: 'heading', text: t('report.presizing') },
      { kind: 'paragraph', label: '', text: t('report.presizingUnavailable') },
    ];
  }
  const selected = presizing.selected;
  return [
    { kind: 'heading', text: t('report.presizing') },
    { kind: 'paragraph', label: '', text: t('report.presizingLead') },
    {
      kind: 'kpis',
      items: [
        { label: t('report.evaluatedPairs'), value: `${presizing.evaluatedPairs} / ${presizing.totalPairs}`, unit: '' },
        { label: t('report.sriTarget'), value: fmt(presizing.sriMin, 3), unit: '' },
        { label: 'SRI', value: fmt(selected.sri, 3), unit: '' },
        { label: 'SVI', value: fmt(selected.svi, 2), unit: '' },
      ],
    },
    {
      kind: 'table',
      head: [t('report.presizingCriterion'), t('report.value')],
      numeric: [1],
      emphasis: [],
      rows: [
        ['α_A', fmt(selected.alphaA, 2)],
        ['α_N', fmt(selected.alphaN, 2)],
        [t('report.minimumPv'), `${fmt(selected.pvPeakKw, 2)} kWc`],
        [t('report.minimumStorage'), `${fmt(selected.storageKwh, 2)} kWh`],
        [t('report.minimumInverter'), `${fmt(selected.inverterKw, 2)} kW`],
        ['LPSP', `${fmt(selected.lpsp * 100, 2)} %`],
        ['LOLP', `${fmt(selected.lolp * 100, 2)} %`],
      ],
    },
    { kind: 'paragraph', label: '', text: presizing.reliable ? t('report.presizingReliable') : t('report.presizingUnreliable') },
  ];
}

function systemBlocks({ project, sizing, catalog, t }: ReportModelInput): readonly Block[] {
  const mod = item(catalog, project.selection.moduleId);
  const bat = item(catalog, project.selection.batteryId);
  const inv = item(catalog, project.selection.inverterId);
  return [
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
  ];
}

function performanceBlocks({ project, finance, t }: ReportModelInput): readonly Block[] {
  const sim = finance?.simulation;
  const life = finance?.lifecycle;
  return [
    { kind: 'heading', text: t('report.expectedPerformance') },
    {
      kind: 'kpis',
      items: [
        { label: t('report.annualProduction'), value: sim ? fmt(sim.annualProductionKwh) : '—', unit: 'kWh' },
        { label: t('report.lcoe'), value: life ? fmt(life.lcoeActualized, 1) : '—', unit: `${project.currency}/kWh` },
        { label: 'SVI', value: life ? fmt(life.svi, 2) : '—', unit: '/ 1' },
        { label: t('report.co2'), value: life ? fmt(life.co2AvoidedKg / 1000, 1) : '—', unit: t('unit.tonnes') },
      ],
    },
  ];
}

function protectionBlocks(input: ReportModelInput): readonly Block[] {
  const { t } = input;
  return [
    { kind: 'heading', text: t('report.protectionsAndCables') },
    {
      kind: 'table',
      head: [t('report.segment'), t('report.protection'), t('report.current'), t('report.caliber'), t('report.cableSection'), t('report.length')],
      numeric: [2, 3, 4, 5],
      emphasis: [],
      rows: buildProtectionRows(input.project, input.sizing, input.catalog, t),
    },
  ];
}

function pricingBlocks({ project, finance, t }: ReportModelInput): readonly Block[] {
  return [
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
      ],
    },
  ];
}

/**
 * Coûts et marges.
 *
 * Réservé à l'offre interne : c'est ce qui la distingue enfin de la pièce
 * remise au client, qui affichait exactement les mêmes prix de vente.
 */
function internalCostBlocks({ project, finance, t }: ReportModelInput): readonly Block[] {
  const money = project.currency;
  if (finance === null) {
    return [
      { kind: 'heading', text: t('report.internalCosts') },
      { kind: 'paragraph', label: '', text: t('report.internalCostsUnavailable') },
    ];
  }
  return [
    { kind: 'heading', text: t('report.internalCosts') },
    { kind: 'paragraph', label: `${t('report.confidential')} :`, text: t('report.internalCostsLead') },
    {
      kind: 'table',
      head: [t('report.item'), t('report.quantity'), t('report.unitCost'), t('report.totalCost'), t('report.marginRate'), t('report.profit')],
      numeric: [1, 2, 3, 4, 5],
      emphasis: [finance.lines.length],
      rows: [
        ...finance.lines.map((line) => [
          line.label, fmt(line.quantity), fmt(line.unitCost), fmt(line.totalCost),
          `${fmt(line.marginRatio * 100, 1)} %`, fmt(line.profit),
        ]),
        [t('report.total'), '', '', fmt(finance.totalCost), `${fmt(finance.averageMarginRatio * 100, 1)} %`, fmt(finance.profit)],
      ],
    },
    {
      kind: 'kpis',
      items: [
        { label: t('report.grossSale'), value: fmt(finance.grossSaleHt), unit: money },
        { label: t('report.granted'), value: fmt(finance.discount), unit: money },
        { label: t('report.netMargin'), value: fmt(finance.profit), unit: money },
        { label: t('report.margin'), value: fmt(finance.averageMarginRatio * 100, 1), unit: '%' },
      ],
    },
  ];
}

function economicsBlocks({ project, finance, t }: ReportModelInput): readonly Block[] {
  const money = project.currency;
  const life = finance?.lifecycle;
  return [
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
  ];
}

function conditionBlocks({ project, t }: ReportModelInput): readonly Block[] {
  const details = project.details;
  const money = project.currency;
  return [
    { kind: 'heading', text: t('report.conditions') },
    { kind: 'paragraph', label: `${t('report.validity')} :`, text: `${fmt(project.costing.offerValidity)} ${t('report.days')} ${t('report.from')} ${dateFr(details.projectDate)}.` },
    { kind: 'paragraph', label: `${t('report.delivery')} :`, text: `${fmt(project.costing.deliveryTime)} ${t('report.days')} ${t('report.afterDeposit')}.` },
    { kind: 'paragraph', label: `${t('report.warranty')} :`, text: `${fmt(project.costing.productWarranty)} ${t('report.months')}.` },
    { kind: 'paragraph', label: `${t('report.studyDuration')} :`, text: `${fmt(project.assumptions.projectLifetime)} ${t('report.years')} · ${t('report.discountRate')} ${fmt(project.assumptions.actualizationRate, 1)} %.` },
    { kind: 'paragraph', label: `${t('report.gridReference')} :`, text: `${fmt(project.assumptions.lcoeGrid, 1)} ${money}/kWh · ${t('report.emissionFactor')} ${fmt(project.assumptions.emissionFactor, 2)} kgCO₂/kWh.` },
  ];
}

/**
 * Règlement.
 *
 * Une proforma sans échéancier ni coordonnées de paiement n'est pas payable :
 * c'était pourtant le seul document que l'application appelait « facture ».
 */
function paymentBlocks({ project, finance, settings, t }: ReportModelInput): readonly Block[] {
  const money = project.currency;
  const bank = settings.reports.bankDetails?.trim() ?? '';
  const blocks: Block[] = [
    { kind: 'heading', text: t('report.payment') },
    {
      kind: 'table',
      head: [t('report.paymentStage'), t('report.share'), t('report.amount')],
      numeric: [1, 2],
      emphasis: [1],
      rows: [
        [`${t('report.downPayment')} — ${t('report.atOrder')}`, `${fmt(project.costing.downPaymentPercent, 1)} %`, finance ? fmt(finance.downPayment) : '—'],
        [`${t('report.balance')} — ${t('report.atDelivery')}`, `${fmt(100 - project.costing.downPaymentPercent, 1)} %`, finance ? fmt(finance.balanceDue) : '—'],
        [t('report.totalInclTax'), '100 %', finance ? fmt(finance.totalTtc) : '—'],
      ],
    },
    { kind: 'paragraph', label: `${t('report.currency')} :`, text: money },
  ];
  if (bank.length > 0) blocks.push({ kind: 'paragraph', label: `${t('report.bankDetails')} :`, text: bank });
  return blocks;
}

function signatureBlocks({ project, settings, t, assets }: ReportModelInput): readonly Block[] {
  const signer = settings.reports.signatureText.trim() || dash(project.details.followerName);
  return [{
    kind: 'signature',
    left: `${settings.company.name || 'KYA-SolDesign'} — ${signer}`,
    right: t('report.forClient'),
    imageUrl: assets?.signatureUrl ?? null,
  }];
}

function diagramBlocks({ project, diagram, t }: ReportModelInput): readonly Block[] {
  if (diagram === null) return [];
  return [
    { kind: 'heading', text: t('report.singleLine') },
    {
      kind: 'image',
      svg: diagram.svg,
      widthPx: diagram.width,
      heightPx: diagram.height,
      caption: `${project.name} — ${dash(project.details.projectNumber)}`,
    },
  ];
}

function billOfMaterialBlocks({ diagram, t }: ReportModelInput): readonly Block[] {
  if (diagram === null || diagram.bom.length === 0) return [];
  return [
    { kind: 'heading', text: t('report.billOfMaterial') },
    {
      kind: 'table',
      head: [t('report.bomReference'), t('report.bomDesignation'), t('report.bomCharacteristic'), t('report.quantity'), t('report.bomLocation')],
      numeric: [3],
      emphasis: [],
      rows: diagram.bom.map((row) => [row.reference, row.designation, row.characteristic, fmt(row.quantity), row.gridRef]),
    },
  ];
}

/** Fiche de mise en service : ce qui se coche sur le chantier, pas au bureau. */
function commissioningBlocks({ t }: ReportModelInput): readonly Block[] {
  return [
    { kind: 'heading', text: t('report.commissioning') },
    { kind: 'paragraph', label: '', text: t('report.commissioningLead') },
    { kind: 'checklist', items: COMMISSIONING_KEYS.map((key) => t(key)) },
  ];
}

/* ------------------------------------------------------------------ */
/* Aides                                                               */
/* ------------------------------------------------------------------ */

/**
 * Besoins du site.
 *
 * Toutes les lignes sont imprimées : une troncature muette laissait un total
 * sans rapport avec le détail affiché. Quand la source ne décrit pas des
 * appareils, la table cède la place aux totaux, qui eux existent toujours.
 */
function loadBlocks(load: ReportLoadSummary, t: (key: string) => string): Block[] {
  const totals: Block = {
    kind: 'kpis',
    items: [
      { label: t('report.loadSource'), value: t(load.originKey), unit: '' },
      { label: t('report.dailyEnergy'), value: load.dailyEnergyWh === null ? '—' : fmt(load.dailyEnergyWh), unit: 'Wh/j' },
      { label: t('report.peakPower'), value: load.peakPowerW === null ? '—' : fmt(load.peakPowerW), unit: 'W' },
    ],
  };
  if (load.rows.length === 0) {
    return [totals, { kind: 'paragraph', label: '', text: t('report.loadNoDetail') }];
  }
  return [
    {
      kind: 'table',
      head: [t('report.item'), t('report.quantity'), t('report.calledPower'), t('report.energyPerDay')],
      numeric: [1, 2, 3],
      emphasis: [load.rows.length],
      rows: [
        ...load.rows.map((row) => [
          row.label,
          fmt(row.quantity),
          row.calledPowerW === null ? '—' : fmt(row.calledPowerW),
          row.dailyEnergyWh === null ? '—' : fmt(row.dailyEnergyWh),
        ]),
        [
          t('report.total'),
          load.totalQuantity === null ? '—' : fmt(load.totalQuantity),
          load.calledPowerW === null ? '—' : fmt(load.calledPowerW),
          load.dailyEnergyWh === null ? '—' : fmt(load.dailyEnergyWh),
        ],
        [t('report.peakPower'), '', '', load.peakPowerW === null ? '—' : `${fmt(load.peakPowerW)} W`],
      ],
    },
    ...(load.fromEngine ? [{ kind: 'paragraph', label: '', text: t('report.loadFromEngine') } satisfies Block] : []),
  ];
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
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-zA-Z0-9]+/gu, '-')
    .replace(/^-|-$/gu, '')
    .toLowerCase() || 'projet';
