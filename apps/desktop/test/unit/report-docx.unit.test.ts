import { inflateRawSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import type { SizingOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../../src/app/models/projectView.js';
import type { ApplicationSettingsV2 } from '../../src/app/models/applicationSettings.js';

/**
 * Le document Word doit dire exactement ce que dit le rapport imprimé, et
 * poser la planche unifilaire sur une page couchée. La rastérisation dépend
 * du canvas du navigateur : elle est remplacée ici par un PNG minimal, ce qui
 * laisse l'assemblage OOXML — la partie qui casse — réellement vérifié.
 */

const PNG_1x1 = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82,
]);

vi.mock('../../src/app/export/rasterize', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/app/export/rasterize')>();
  return {
    ...actual,
    rasterizeSvg: async () => ({ png: PNG_1x1, widthPx: 3153, heightPx: 2000 }),
  };
});

const sizing: SizingOutputV1 = {
  selectedEquipment: { moduleId: 'm', batteryId: 'b', inverterId: 'i' },
  pv: { modulesInSeries: 10, stringsInParallel: 3, totalModules: 30, requiredPowerKwc: 12, obtainedPowerKwc: 13.65, marginRatio: 0.1, vmpOperatingV: 410, vocColdV: 556, iscA: 34.8 },
  battery: { unitsInSeries: 4, stringsInParallel: 2, totalUnits: 8, requiredEnergyKwh: 9, obtainedEnergyKwh: 19.2, usefulEnergyKwh: 9.6, marginRatio: 0.1, bankVoltageV: 48 },
  inverter: { count: 1, requiredPowerKw: 4, obtainedPowerKw: 5, marginRatio: 0.2 },
  compatibility: { compatible: true, issues: [], warnings: [] },
  valid: true,
} as SizingOutputV1;

const project = {
  id: 'p1',
  name: 'Centrale de Bouaké',
  systemType: 'standalone_inverter_controller',
  currency: 'FCFA',
  details: { clientName: 'Coopérative du Gbêkê', clientAddress: '', clientTel: '+225 00', clientEmail: '', followerName: 'J.-C. K.', applicationType: 'agricultural', projectDate: '2026-09-04', projectNumber: 'KSD-2026-042', projectLocation: 'Bouaké', projectImage: '' },
  site: { country: "Côte d'Ivoire", countryCode: 'CI', localityId: null, region: 'Gbêkê', latitude: 7.69, longitude: -5.03, tilt: 12, azimuth: 180, irradiation: 5.2, monthlyIrradiation: [], weatherSourceId: null, timezoneIana: null, designMonth: null, irradiationBasis: null, downloadedSource: null },
  load: { granularity: 'annual', activeMode: 'simple', composition: null, calendar: { version: 2, mode: 'annual', dayGroups: [], periods: [], assignments: [] }, profiles: [], activeProfileId: '', irMin: 10 },
  assumptions: { projectLifetime: 20, actualizationRate: 8, lcoeGrid: 90, emissionFactor: 0.6 },
  selection: { moduleId: 'm', batteryId: 'b', inverterId: 'i' },
  cables: [
    { segment: 'pv_inverter', length: 25, material: 'copper', installation: 'not_buried', maxVoltageDropPercent: 3 },
    { segment: 'inverter_battery', length: 4, material: 'copper', installation: 'not_buried', maxVoltageDropPercent: 1 },
    { segment: 'inverter_load', length: 18, material: 'copper', installation: 'not_buried', maxVoltageDropPercent: 3 },
  ],
  protections: [
    { segment: 'pv_inverter', caliberA: 32, type: 'Disjoncteur DC' },
    { segment: 'inverter_battery', caliberA: 125, type: 'Disjoncteur DC' },
    { segment: 'inverter_load', caliberA: 32, type: 'Disjoncteur AC' },
  ],
  costing: { tvaPercent: 18, downPaymentPercent: 40, offerValidity: 30, deliveryTime: 45, productWarranty: 24 },
} as unknown as ProjectViewModel;

const settings = {
  company: { name: 'KYA-Energy Group', address: 'Lomé', phone: '+228 00', email: 'contact@kya.tg' },
  reports: { footerText: '', logoUrl: '', logoAssetId: null, signatureAssetId: null, coverAssetId: null, signatureText: '', bankDetails: '' },
} as unknown as ApplicationSettingsV2;

const catalog = [
  { id: 'm', kind: 'pv-module', manufacturer: 'Canadian', model: 'CS7L-455', nominalPowerW: 455, openCircuitVoltageV: 49.6, shortCircuitCurrentA: 11.6 },
  { id: 'b', kind: 'battery', manufacturer: 'Victron', model: 'GEL 200', nominalVoltageV: 12, nominalCapacityAh: 200 },
  { id: 'i', kind: 'inverter', manufacturer: 'DEYE', model: 'SUN-5K', nominalAcPowerW: 5000, nominalDcVoltageV: 48, nominalAcVoltageV: 230 },
] as never;

const t = (key: string) => key;

import { buildReportDocument, type ReportDocument } from '../../src/app/export/reportModel';
import { defaultReportOptions } from '../../src/app/export/documentComposition';
import { writeDocx } from '../../src/app/export/docxWriter';
import { buildProjectDiagram } from '../../src/app/diagram/projectDiagram';

// Les deux planches sont construites une fois, au chargement du module : le
// générateur est déterministe, et ce coût n'a pas à peser sur un cas de test.
const make = (kind: 'rapport' | 'dossier_exec') => {
  const generated = buildProjectDiagram({ project, sizing, catalog, settings, lang: 'fr', options: kind === 'rapport' ? { format: 'a4-portrait', detail: 'synoptic', showGridFrame: false } : undefined });
  return { svg: generated.svg, width: generated.plan.width, height: generated.plan.height, bom: generated.plan.bom };
};
const PLANS = { rapport: make('rapport'), dossier_exec: make('dossier_exec') } as const;
const diagramOf = (kind: 'rapport' | 'dossier_exec') => PLANS[kind];

/** Les titres de section disent la composition d'une pièce mieux qu'un compte de blocs. */
const headingsOf = (document: ReportDocument): string[] =>
  document.sections.flatMap((section) => section.blocks).flatMap((block) => block.kind === 'heading' ? [block.text] : []);

describe('document Word', () => {
  it('assemble le rapport en une garde, un corps et une planche couchée', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    // Garde, corps, puis la planche sur sa propre page couchée : un schéma
    // ramené à la largeur d'une colonne portrait n'était plus lisible.
    expect(document.sections).toHaveLength(3);
    expect(document.sections[0]!.blocks[0]!.kind).toBe('cover');
    expect(document.sections.at(-1)!.orientation).toBe('landscape');
    expect(document.fileName).toBe('centrale-de-bouake-rapport.docx');
    expect(document.company.contact).toContain('Lomé');
    expect(headingsOf(document)).toEqual(expect.arrayContaining([
      'report.siteResource', 'report.siteNeeds', 'report.methodology',
      'report.presizing', 'report.recommendedSystem', 'report.protectionsAndCables',
      'report.financialAssessment', 'report.singleLine',
    ]));
  });

  it('couche la planche du dossier d’exécution et y joint la nomenclature', () => {
    const document = buildReportDocument({ project, kind: 'dossier_exec', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('dossier_exec') });
    const last = document.sections.at(-1)!;
    expect(last.orientation).toBe('landscape');
    const table = last.blocks.find((block) => block.kind === 'table');
    expect(table?.kind === 'table' && table.rows.length).toBeGreaterThan(3);
  });

  it('n’ouvre pas de section pour une planche absente', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing: null, finance: null, solar: null, catalog, settings, t, diagram: null });
    expect(document.sections).toHaveLength(2);
    expect(document.sections.every((section) => section.orientation === 'portrait')).toBe(true);
    expect(document.sections.flatMap((section) => section.blocks).some((block) => block.kind === 'image')).toBe(false);
  });

  it('porte les mêmes calibres que le tableau des protections', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const rows = document.sections.flatMap((section) => section.blocks).flatMap((block) => block.kind === 'table' ? block.rows : []);
    expect(rows.some((row) => row.includes('32,0 A'))).toBe(true);
  });

  it('couche la planche de toutes les pièces, pas seulement du dossier d’exécution', () => {
    for (const kind of ['rapport', 'offre', 'dossier_exec'] as const) {
      const document = buildReportDocument({ project, kind, sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf(kind === 'dossier_exec' ? 'dossier_exec' : 'rapport') });
      const plate = document.sections.find((section) => section.blocks.some((block) => block.kind === 'image'));
      expect(plate, kind).toBeDefined();
      expect(plate!.orientation, kind).toBe('landscape');
    }
  });

  it('n’écrit plus « utile » nulle part dans le document', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const strings = document.sections.flatMap((section) => section.blocks).flatMap((block) => {
      if (block.kind === 'cover') return [block.system, block.subtitle, block.ownership];
      if (block.kind === 'table') return block.rows.flat();
      if (block.kind === 'kpis') return block.items.map((entry) => `${entry.label} ${entry.value} ${entry.unit}`);
      return [];
    });
    // `report.useful` est la clé qui produisait « utiles » : elle ne doit plus
    // être demandée, et le mot ne doit plus apparaître en clair.
    expect(strings.some((value) => /utile/iu.test(value) || value.includes('report.useful'))).toBe(false);
  });

  it('porte sur sa couverture un libellé traduisible et une mention de propriété', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const cover = document.sections[0]!.blocks[0]!;
    expect(cover.kind).toBe('cover');
    if (cover.kind !== 'cover') return;
    // Le bandeau était écrit en dur dans le rédacteur Word : il sortait en
    // français même sur un document demandé en anglais.
    expect(cover.systemLabel).toBe('report.selectedSystem');
    expect(cover.ownership).toContain('KYA-Energy Group');
    expect(cover.ownership).toContain('©');
  });

  it('réduit la proforma à la pièce comptable', () => {
    const document = buildReportDocument({ project, kind: 'proforma', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const headings = headingsOf(document);
    // Une facture ne porte ni planche, ni sections de câbles, ni bilan carbone.
    expect(document.sections.flatMap((section) => section.blocks).some((block) => block.kind === 'image')).toBe(false);
    expect(headings).not.toContain('report.protectionsAndCables');
    expect(headings).not.toContain('report.expectedPerformance');
    // Elle porte en revanche ce qui la rend payable.
    expect(headings).toContain('report.payment');
    expect(headings).toContain('report.conditions');
  });

  it('imprime des références lisibles, jamais les identifiants internes', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const cells = document.sections.flatMap((section) => section.blocks).flatMap((block) => block.kind === 'table' ? block.rows.flat() : []);
    expect(cells).toContain('CS7L-455');
    expect(cells).toContain('GEL 200');
    expect(cells).toContain('SUN-5K');
    // « pv-module_5169… » ne se recopie pas sur un bon de commande.
    expect(cells.some((cell) => /^(?:pv-module|battery|inverter)_/u.test(cell))).toBe(false);
  });

  it('nomme ce que chaque grandeur du système dimensionne', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const cover = document.sections[0]!.blocks[0]!;
    expect(cover.kind === 'cover' && cover.system).toContain('report.summaryPv');
    expect(cover.kind === 'cover' && cover.system).toContain('report.summaryStorage');
    expect(cover.kind === 'cover' && cover.system).toContain('report.summaryInverter');
    // « kWh utiles » sans sujet laissait deviner de quoi on parlait.
    expect(cover.kind === 'cover' && cover.system).not.toContain('report.useful');
  });

  it('réserve les coûts d’achat et les marges à l’offre interne', () => {
    const internal = buildReportDocument({ project, kind: 'offre', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const client = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    expect(headingsOf(internal)).toContain('report.internalCosts');
    expect(headingsOf(client)).not.toContain('report.internalCosts');
  });

  it('retire tous les montants quand on génère sans les prix', () => {
    const options = { ...defaultReportOptions('rapport', 'fr'), withPrices: false };
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport'), options });
    const headings = headingsOf(document);
    expect(headings).not.toContain('report.financialAssessment');
    expect(headings).not.toContain('report.economicIndicators');
    // Le contenu technique, lui, reste entier.
    expect(headings).toContain('report.recommendedSystem');
    expect(headings).toContain('report.protectionsAndCables');
  });

  it('respecte les sections décochées et le nom de fichier choisi', () => {
    const base = defaultReportOptions('rapport', 'fr');
    const options = {
      ...base,
      sections: base.sections.filter((id) => id !== 'presizing' && id !== 'siteResource'),
      fileName: 'Offre Bouaké — révision 2',
      watermark: 'brouillon',
    };
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport'), options });
    expect(headingsOf(document)).not.toContain('report.presizing');
    expect(headingsOf(document)).not.toContain('report.siteResource');
    expect(document.fileName).toBe('offre-bouake-revision-2.docx');
    expect(document.watermark).toBe('brouillon');
  });

  it('ajoute la fiche de mise en service au seul dossier d’exécution', () => {
    const execution = buildReportDocument({ project, kind: 'dossier_exec', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('dossier_exec') });
    const checklist = execution.sections.flatMap((section) => section.blocks).find((block) => block.kind === 'checklist');
    expect(checklist?.kind === 'checklist' && checklist.items.length).toBeGreaterThan(5);

    const report = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('rapport') });
    expect(report.sections.flatMap((section) => section.blocks).some((block) => block.kind === 'checklist')).toBe(false);
  });

  it('produit un .docx valide, avec une section couchée et l’image de la planche', async () => {
    const document = buildReportDocument({ project, kind: 'dossier_exec', sizing, finance: null, solar: null, catalog, settings, t, diagram: diagramOf('dossier_exec') });
    const bytes = new Uint8Array(await (await writeDocx(document)).arrayBuffer());

    // Signature ZIP : un .docx est une archive OOXML.
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    const listing = new TextDecoder('latin1').decode(bytes);
    expect(listing).toContain('word/media/');

    const xml = readZipEntry(bytes, 'word/document.xml');
    expect(xml).toContain('w:orient="landscape"');
    expect(xml).toContain('report.singleLine');
    expect(xml).toContain('report.billOfMaterial');
    // Deux pages portrait suivies d'une page couchée.
    expect((xml.match(/w:orient="portrait"/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((xml.match(/w:orient="landscape"/g) ?? []).length).toBe(1);
  });
});

/** Lit une entrée d'archive ZIP, par son en-tête local. */
function readZipEntry(bytes: Uint8Array, entryName: string): string {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const name = new TextEncoder().encode(entryName);
  for (let offset = 0; offset + 30 < bytes.length; offset += 1) {
    if (view.getUint32(offset, true) !== 0x04034b50) continue;
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const start = offset + 30;
    if (nameLength !== name.length) continue;
    if (!name.every((code, index) => bytes[start + index] === code)) continue;

    const method = view.getUint16(offset + 8, true);
    const compressed = view.getUint32(offset + 18, true);
    const body = bytes.subarray(start + nameLength + extraLength, start + nameLength + extraLength + compressed);
    if (method === 0) return new TextDecoder().decode(body);
    return new TextDecoder().decode(inflateRawSync(Buffer.from(body)));
  }
  throw new Error(`Entrée introuvable dans l’archive : ${entryName}`);
}
