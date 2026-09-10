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
  reports: { footerText: '', logoUrl: '', logoAssetId: null },
} as unknown as ApplicationSettingsV2;

const catalog = [
  { id: 'm', kind: 'pv-module', manufacturer: 'Canadian', model: 'CS7L-455', nominalPowerW: 455, openCircuitVoltageV: 49.6, shortCircuitCurrentA: 11.6 },
  { id: 'b', kind: 'battery', manufacturer: 'Victron', model: 'GEL 200', nominalVoltageV: 12, nominalCapacityAh: 200 },
  { id: 'i', kind: 'inverter', manufacturer: 'DEYE', model: 'SUN-5K', nominalAcPowerW: 5000, nominalDcVoltageV: 48, nominalAcVoltageV: 230 },
] as never;

const t = (key: string) => key;

import { buildReportDocument } from '../../src/app/export/reportModel';
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

describe('document Word', () => {
  it('reprend les sections du rapport imprimé', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, catalog, settings, t, diagram: diagramOf('rapport') });
    // Page de garde, page 1, page 2, planche.
    expect(document.sections).toHaveLength(4);
    expect(document.sections[0]!.blocks[0]!.kind).toBe('cover');
    expect(document.fileName).toBe('centrale-de-bouake-rapport.docx');
    expect(document.company.contact).toContain('Lomé');
    const headings = document.sections.flatMap((section) => section.blocks.filter((block) => block.kind === 'heading').map((block) => block.text));
    expect(headings).toContain('report.protectionsAndCables');
    expect(headings).toContain('report.singleLine');
  });

  it('couche la planche du dossier d’exécution et y joint la nomenclature', () => {
    const document = buildReportDocument({ project, kind: 'dossier_exec', sizing, finance: null, catalog, settings, t, diagram: diagramOf('dossier_exec') });
    const last = document.sections[3]!;
    expect(last.orientation).toBe('landscape');
    const table = last.blocks.find((block) => block.kind === 'table');
    expect(table?.kind === 'table' && table.rows.length).toBeGreaterThan(3);
  });

  it('garde le rapport à deux sections tant que le dimensionnement manque', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing: null, finance: null, catalog, settings, t, diagram: null });
    expect(document.sections).toHaveLength(3);
  });

  it('porte les mêmes calibres que le tableau des protections', () => {
    const document = buildReportDocument({ project, kind: 'rapport', sizing, finance: null, catalog, settings, t, diagram: diagramOf('rapport') });
    const table = document.sections[2]!.blocks.find((block) => block.kind === 'table');
    expect(table?.kind === 'table' && table.rows.some((row) => row.includes('32,0 A'))).toBe(true);
  });

  it('retire la planche de la facture proforma', () => {
    const document = buildReportDocument({ project, kind: 'proforma', sizing, finance: null, catalog, settings, t, diagram: diagramOf('rapport') });
    expect(document.sections).toHaveLength(3);
    expect(document.sections.flatMap((section) => section.blocks).some((block) => block.kind === 'image')).toBe(false);
  });

  it('produit un .docx valide, avec une section couchée et l’image de la planche', async () => {
    const document = buildReportDocument({ project, kind: 'dossier_exec', sizing, finance: null, catalog, settings, t, diagram: diagramOf('dossier_exec') });
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
