import { useSettings } from '../../store/settings.js';
import { logger } from './logger.js';
import { isTauri } from './runtime.js';

export interface SaveFileRequest {
  /** Nom proposé, déjà nettoyé par `safeFileName`. */
  readonly suggestedName: string;
  readonly data: Blob | string;
  readonly mimeType: string;
  /** Filtre de la boîte de dialogue : libellé et extensions sans point. */
  readonly filter?: { readonly name: string; readonly extensions: readonly string[] };
}

export type SaveOutcome = { readonly status: 'saved'; readonly path: string | null } | { readonly status: 'cancelled' };

const LAST_DIRECTORY_KEY = 'kya-sol-design.last-export-directory';

/**
 * Nom de fichier lisible et portable : accents translittérés (« Modifié » →
 * « Modifie »), séparateurs uniformisés, aucun caractère interdit sous Windows.
 */
export function safeFileName(value: string, fallback = 'kya-sol-design'): string {
  const cleaned = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[œŒ]/gu, (match) => (match === 'œ' ? 'oe' : 'OE'))
    .replace(/[æÆ]/gu, (match) => (match === 'æ' ? 'ae' : 'AE'))
    // Caractères interdits sous Windows ; les caractères de contrôle tombent dans le filtre suivant.
    .replace(/[<>:"/\\|?*]+/gu, ' ')
    .replace(/[^a-zA-Z0-9._ -]+/gu, '-')
    .replace(/\s+/gu, '-')
    .replace(/-{2,}/gu, '-')
    .replace(/^[-.]+|[-.]+$/gu, '');
  return cleaned.slice(0, 120) || fallback;
}

function rememberedDirectory(): string | null {
  if (useSettings.getState().projects.exportDestinationMode !== 'platform-handle') return null;
  try { return localStorage.getItem(LAST_DIRECTORY_KEY); } catch { return null; }
}

function rememberDirectory(path: string): void {
  if (useSettings.getState().projects.exportDestinationMode !== 'platform-handle') return;
  const separator = Math.max(path.lastIndexOf('\\'), path.lastIndexOf('/'));
  if (separator <= 0) return;
  try { localStorage.setItem(LAST_DIRECTORY_KEY, path.slice(0, separator)); } catch { /* préférence de confort seulement */ }
}

/**
 * Enregistre un fichier produit par l'application. Sous Tauri, une boîte
 * « Enregistrer sous » native ; dans le navigateur, le téléchargement habituel.
 * Le réglage « destination d'export » décide si le dernier dossier est repris.
 */
export async function saveFile(request: SaveFileRequest): Promise<SaveOutcome> {
  if (!isTauri()) {
    const blob = typeof request.data === 'string' ? new Blob([request.data], { type: request.mimeType }) : request.data;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = request.suggestedName;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1_000);
    return { status: 'saved', path: null };
  }
  const [{ save }, { writeFile }, { join }] = await Promise.all([import('@tauri-apps/plugin-dialog'), import('@tauri-apps/plugin-fs'), import('@tauri-apps/api/path')]);
  const directory = rememberedDirectory();
  const path = await save({
    defaultPath: directory ? await join(directory, request.suggestedName) : request.suggestedName,
    ...(request.filter ? { filters: [{ name: request.filter.name, extensions: [...request.filter.extensions] }] } : {}),
  });
  if (path === null) return { status: 'cancelled' };
  const bytes = typeof request.data === 'string' ? new TextEncoder().encode(request.data) : new Uint8Array(await request.data.arrayBuffer());
  await writeFile(path, bytes);
  rememberDirectory(path);
  logger.info('file.saved', path);
  return { status: 'saved', path };
}
