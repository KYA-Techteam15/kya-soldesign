import { reportAssetRepository, type StoredReportAsset } from '../adapters/reportAssetRepository.js';
import type { ApplicationSettingsV2 } from '../models/applicationSettings.js';

/**
 * Transfert des réglages.
 *
 * Les visuels vivent dans IndexedDB, hors du JSON. Les exporter séparément
 * revenait à ne pas les exporter : le fichier repartait avec des identifiants
 * qui ne désignaient plus rien sur la machine d'arrivée, et le logo disparaissait
 * sans un mot. Le paquet emporte donc les images avec les réglages.
 */

const SCHEMA = 'kya-sol-design.settings';
const ASSET_KINDS = ['logo', 'signature', 'cover'] as const;
type AssetKind = (typeof ASSET_KINDS)[number];

interface PackedAsset {
  readonly kind: AssetKind;
  readonly filename: string;
  readonly mimeType: string;
  /** Contenu du fichier en base64, sans préfixe `data:`. */
  readonly base64: string;
}

export interface SettingsBundle {
  readonly schema: typeof SCHEMA;
  readonly version: 2;
  readonly settings: ApplicationSettingsV2;
  readonly assets: readonly PackedAsset[];
}

/** Identifiant stocké pour chaque nature de visuel. */
const assetIdOf = (settings: ApplicationSettingsV2, kind: AssetKind): string | null =>
  kind === 'logo' ? settings.reports.logoAssetId
    : kind === 'signature' ? settings.reports.signatureAssetId
      : settings.reports.coverAssetId;

export async function packSettings(settings: ApplicationSettingsV2): Promise<string> {
  const assets: PackedAsset[] = [];
  for (const kind of ASSET_KINDS) {
    const id = assetIdOf(settings, kind);
    if (id === null) continue;
    const stored = await reportAssetRepository.get(id);
    // Un visuel introuvable ne bloque pas l'export : on emporte ce qui existe
    // et l'identifiant orphelin sera neutralisé à la lecture.
    if (stored !== null) assets.push(await packAsset(stored, kind));
  }
  const bundle: SettingsBundle = { schema: SCHEMA, version: 2, settings, assets };
  return JSON.stringify(bundle, null, 2);
}

export interface UnpackedSettings {
  readonly settings: unknown;
  /** Nombre de visuels réellement restaurés, pour le dire à l'utilisateur. */
  readonly restoredAssets: number;
}

/**
 * Relit un paquet et réinstalle ses visuels.
 *
 * Les images reçoivent de nouveaux identifiants — ceux de la machine d'origine
 * n'ont aucune valeur ici — et les réglages sont réécrits pour les désigner.
 * Un ancien fichier sans images reste lisible : il perd simplement ses renvois.
 */
export async function unpackSettings(text: string): Promise<UnpackedSettings> {
  const parsed = JSON.parse(text) as Partial<SettingsBundle> & { settings?: unknown };
  const raw = parsed.settings ?? parsed;
  if (typeof raw !== 'object' || raw === null) throw new Error('SETTINGS_BUNDLE_INVALID');

  const reports = { ...(raw as { reports?: Record<string, unknown> }).reports };
  // Tout identifiant venu d'ailleurs est mort à l'arrivée : on le coupe avant
  // de tenter la restauration, pour qu'un échec ne laisse pas un renvoi cassé.
  reports.logoAssetId = null;
  reports.signatureAssetId = null;
  reports.coverAssetId = null;

  let restoredAssets = 0;
  for (const asset of parsed.assets ?? []) {
    if (!ASSET_KINDS.includes(asset.kind)) continue;
    try {
      const file = new File([base64ToBytes(asset.base64)], asset.filename, { type: asset.mimeType });
      const stored = await reportAssetRepository.store(file, asset.kind);
      reports[`${asset.kind}AssetId`] = stored.id;
      restoredAssets += 1;
    } catch {
      // Un visuel refusé (trop lourd, type non pris en charge, SVG douteux)
      // ne doit pas emporter le reste des réglages avec lui.
    }
  }

  return { settings: { ...(raw as Record<string, unknown>), reports }, restoredAssets };
}

async function packAsset(asset: StoredReportAsset, kind: AssetKind): Promise<PackedAsset> {
  const bytes = new Uint8Array(await asset.blob.arrayBuffer());
  return { kind, filename: asset.filename, mimeType: asset.mimeType, base64: bytesToBase64(bytes) };
}

/**
 * Conversions base64.
 *
 * `btoa` travaille sur des unités de code latin-1 : on lui donne donc les
 * octets un à un, par tranches, plutôt qu'un `String.fromCharCode(...bytes)`
 * qui dépasse la pile d'appels sur une image de deux mégaoctets.
 */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
