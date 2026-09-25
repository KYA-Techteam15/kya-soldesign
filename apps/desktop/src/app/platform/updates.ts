import { logger } from './logger.js';
import { isTauri } from './runtime.js';

export type UpdateChannel = 'stable' | 'beta';

export type UpdateCheck =
  | { readonly status: 'unconfigured' }
  | { readonly status: 'up-to-date' }
  | { readonly status: 'available'; readonly version: string; readonly notes: string | null; readonly install: () => Promise<void> }
  | { readonly status: 'error'; readonly message: string };

interface UpdateInfo { readonly version: string; readonly currentVersion: string; readonly notes: string | null; readonly date: string | null }

const CHANNEL_KEY = 'ksd.update.channel';
const LAST_CHECK_KEY = 'ksd.update.lastCheck';
const DAY = 86_400_000;

async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke: call } = await import('@tauri-apps/api/core');
  return call<T>(command, args);
}

/** Commande absente de l'hôte : le module de mise à jour n'est pas compilé dans cette version. */
function isUnconfigured(message: string): boolean {
  return /not (?:found|allowed)|unknown command|plugin updater|UPDATE_CHANNEL_UNAVAILABLE/iu.test(message);
}

/** Canaux proposés par l'hôte ; aucun quand les mises à jour ne sont pas configurées. */
export async function updateChannels(): Promise<readonly UpdateChannel[]> {
  if (!isTauri()) return [];
  try { return await invoke<UpdateChannel[]>('update_channels'); } catch { return []; }
}

export function readUpdateChannel(): UpdateChannel {
  try { return localStorage.getItem(CHANNEL_KEY) === 'beta' ? 'beta' : 'stable'; } catch { return 'stable'; }
}

export function writeUpdateChannel(channel: UpdateChannel): void {
  try { localStorage.setItem(CHANNEL_KEY, channel); } catch { /* préférence de séance */ }
}

/**
 * Recherche d'une mise à jour sur le canal choisi (spec 012, FR-E1). Sans module de mise à jour
 * dans l'hôte, l'état « non configuré » est rendu, jamais une fausse absence de mise à jour.
 */
export async function checkForUpdate(channel: UpdateChannel = readUpdateChannel()): Promise<UpdateCheck> {
  if (!isTauri()) return { status: 'unconfigured' };
  try {
    const found = await invoke<UpdateInfo | null>('check_update', { channel });
    try { localStorage.setItem(LAST_CHECK_KEY, String(Date.now())); } catch { /* sans mémoire, on revérifiera */ }
    if (found === null) return { status: 'up-to-date' };
    return {
      status: 'available',
      version: found.version,
      notes: found.notes,
      install: async () => {
        await invoke('install_update');
        // Sous Windows l'installateur ferme l'application ; ailleurs, on relance.
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isUnconfigured(message)) return { status: 'unconfigured' };
    logger.warn('updates.check', error);
    return { status: 'error', message };
  }
}

/** Vérification automatique : au plus une fois par jour, et seulement en ligne. */
export function automaticCheckDue(now = Date.now()): boolean {
  if (!isTauri() || (typeof navigator !== 'undefined' && !navigator.onLine)) return false;
  try { return now - Number(localStorage.getItem(LAST_CHECK_KEY) ?? 0) > DAY; } catch { return true; }
}
