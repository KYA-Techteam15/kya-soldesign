import { inflateRawSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import type { SizingOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../../src/app/models/projectView.js';
import type { ApplicationSettingsV2 } from '../../src/app/models/applicationSettings.js';

/**
 * Visuels du document Word.
 *
 * L'aperçu retombait sur le logo livré avec l'application quand aucun fichier
 * n'était importé ; le Word, lui, ne recevait rien. Le même dossier sortait
 * donc signé à l'écran et anonyme dans le document remis au client. Ces cas
 * ouvrent réellement l'archive OOXML pour vérifier que les images y sont.
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
  return { ...actual, rasterizeSvg: async () => ({ png: PNG_1x1, widthPx: 3153, heightPx: 2000 }) };
});

// Le chargeur de visuels lit l'URL avec `fetch`, puis mesure le ratio avec
// `Image` : ni l'un ni l'autre n'existe hors navigateur. On fournit le strict
// nécessaire pour que le chemin réel du code soit exercé.
// Chaque visuel doit produire des octets distincts : avec un contenu
// identique, l'archive n'en garde qu'une copie et le compte d'images ne
// prouverait plus rien. Les octets ajoutés après IEND sont ignorés des
// lecteurs PNG et suffisent à distinguer les fichiers.
vi.stubGlobal('fetch', async (url: string) => {
  const marker = new TextEncoder().encode(String(url));
  const bytes = new Uint8Array(PNG_1x1.length + marker.length);
  bytes.set(PNG_1x1, 0);
  bytes.set(marker, PNG_1x1.length);
  return new Response(bytes.buffer as ArrayBuffer);
});
vi.stubGlobal('Image', class {
  public naturalWidth = 100;
  public naturalHeight = 40;
  public onload: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  public set src(_value: string) { queueMicrotask(() => this.onload?.()); }
});

const sizing = {
  selectedEquipment: { moduleId: 'm', batteryId: 'b', inverterId: 'i' },
  pv: { modulesInSeries: 10, stringsInParallel: 3, totalModules: 30, requiredPowerKwc: 12, obtainedPowerKwc: 13.65, marginRatio: 0.1, vmpOperatingV: 410, vocColdV: 556, iscA: 34.8 },
  battery: { unitsInSeries: 4, stringsInParallel: 2, totalUnits: 8, requiredEnergyKwh: 9, obtainedEnergyKwh: 19.2, usefulEnergyKwh: 9.6, marginRatio: 0.1, bankVoltageV: 48 },
  inverter: { count: 1, requiredPowerKw: 4, obtainedPowerKw: 5, marginRatio: 0.2 },
  compatibility: { compatible: true, issues: [], warnings: [] }, valid: true,
} as SizingOutputV1;

const project = {
  id: 'p1', name: 'Centrale de Bouaké', systemType: 'standalone_all_in_one', currency: 'XOF',
  details: { clientName: 'Coopérative', clientAddress: '', clientTel: '', clientEmail: '', followerName: 'J.-C. K.', applicationType: 'agricultural', projectDate: '2026-09-04', projectNumber: 'KSD-2026-042', projectLocation: 'Bouaké', projectImage: '' },
  site: { country: 'Togo', countryCode: 'TG', localityId: null, region: 'Gbêkê', latitude: 7.69, longitude: -5.03, tilt: 12, azimuth: 180, irradiation: 0, monthlyIrradiation: [], weatherSourceId: null, timezoneIana: null, designMonth: null, irradiationBasis: null, downloadedSource: null },
  load: { granularity: 'annual', activeMode: 'simple', composition: null, calendar: { version: 2, mode: 'annual', dayGroups: [], periods: [], assignments: [] }, profiles: [], activeProfileId: '', irMin: 10 },
  assumptions: { projectLifetime: 20, actualizationRate: 8, lcoeGrid: 90, emissionFactor: 0.6, lpspMax: 5, lolpMax: 5, systemPr: 80, inverterYield: 95, batteryYield: 90 },
  selection: { moduleId: 'm', batteryId: 'b', inverterId: 'i' },
  cables: [], protections: [],
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

import { buildReportDocument } from '../../src/app/export/reportModel';
import { writeDocx } from '../../src/app/export/docxWriter';
import { buildProjectDiagram } from '../../src/app/diagram/projectDiagram';

const built = buildProjectDiagram({ project, sizing, catalog, settings, lang: 'fr' });
const diagram = { svg: built.svg, width: built.plan.width, height: built.plan.height, bom: built.plan.bom };

/** Noms des fichiers stockés dans l'archive, lus sur les en-têtes locaux. */
function entryNames(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const names: string[] = [];
  for (let offset = 0; offset + 30 < bytes.length; offset += 1) {
    if (view.getUint32(offset, true) !== 0x04034b50) continue;
    const nameLength = view.getUint16(offset + 26, true);
    names.push(new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength)));
  }
  return names;
}

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
    return method === 0 ? new TextDecoder().decode(body) : new TextDecoder().decode(inflateRawSync(Buffer.from(body)));
  }
  throw new Error(`Entrée introuvable : ${entryName}`);
}

const docxOf = async (assets: { logoUrl: string | null; coverUrl: string | null; signatureUrl: string | null }) => {
  const document = buildReportDocument({
    project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t, diagram, assets,
  });
  return new Uint8Array(await (await writeDocx(document)).arrayBuffer());
};

describe('visuels du document Word', () => {
  it('embarque le logo, la couverture et la planche dans l’archive', async () => {
    const bytes = await docxOf({ logoUrl: 'blob:logo', coverUrl: 'blob:cover', signatureUrl: 'blob:signature' });
    expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);

    const media = entryNames(bytes).filter((entry) => entry.startsWith('word/media/'));
    // Logo, image de couverture, planche rastérisée : trois visuels distincts.
    expect(media.length).toBeGreaterThanOrEqual(3);
  });

  it('produit moins d’images quand les visuels manquent — et reste valide', async () => {
    const withVisuals = entryNames(await docxOf({ logoUrl: 'blob:logo', coverUrl: 'blob:cover', signatureUrl: null }))
      .filter((entry) => entry.startsWith('word/media/')).length;
    const bare = await docxOf({ logoUrl: null, coverUrl: null, signatureUrl: null });
    const without = entryNames(bare).filter((entry) => entry.startsWith('word/media/')).length;

    expect(Array.from(bare.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
    // La planche reste ; le logo et la couverture, non. Sans cet écart, la
    // présence des images ne prouverait rien.
    expect(without).toBeGreaterThanOrEqual(1);
    expect(withVisuals).toBeGreaterThan(without);
  });

  it('pose la planche sur une page couchée', async () => {
    const bytes = await docxOf({ logoUrl: 'blob:logo', coverUrl: null, signatureUrl: null });
    const xml = readZipEntry(bytes, 'word/document.xml');
    expect(xml).toContain('w:orient="landscape"');
  });
});

describe('planche unifilaire dans la page', () => {
  it('ne dépasse jamais la hauteur utile de la page couchée', async () => {
    // Une planche très haute — le cas qui débordait : ramenée à la seule
    // largeur, elle sortait par le bas de la feuille.
    const tall = { ...diagram, width: 1000, height: 2400 };
    const document = buildReportDocument({
      project, kind: 'rapport', sizing, finance: null, solar: null, catalog, settings, t,
      diagram: tall, assets: { logoUrl: null, coverUrl: null, signatureUrl: null },
    });
    const bytes = new Uint8Array(await (await writeDocx(document)).arrayBuffer());
    const xml = readZipEntry(bytes, 'word/document.xml');

    // `docx` exprime les tailles en EMU : 914 400 par pouce, 36 000 par mm.
    const extents = [...xml.matchAll(/<wp:extent cx="(\d+)" cy="(\d+)"\/>/gu)];
    expect(extents.length).toBeGreaterThan(0);
    const tallestMm = Math.max(...extents.map((match) => Number(match[2]) / 36_000));
    // Hauteur utile d'une A4 couchée, en-tête et pied déduits.
    expect(tallestMm).toBeLessThanOrEqual(148 + 1);
  });
});
