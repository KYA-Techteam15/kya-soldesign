import { logger } from './logger.js';
import { isTauri } from './runtime.js';

export type UpdateCheck =
  | { readonly status: 'unconfigured' }
  | { readonly status: 'up-to-date' }
  | { readonly status: 'available'; readonly version: string; readonly notes: string | null; readonly install: () => Promise<void> }
  | { readonly status: 'error'; readonly message: string };

/**
 * Recherche d'une mise à jour. Le module n'est compilé dans l'hôte qu'une fois
 * l'hébergement des mises à jour et la clé de signature décidés (fonctionnalité
 * Cargo `updater`) ; sans lui, l'état « non configuré » est rendu, jamais une
 * fausse absence de mise à jour.
 */
export async function checkForUpdate(): Promise<UpdateCheck> {
  if (!isTauri()) return { status: 'unconfigured' };
  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();
    if (update === null) return { status: 'up-to-date' };
    return {
      status: 'available',
      version: update.version,
      notes: update.body ?? null,
      install: async () => {
        await update.downloadAndInstall();
        const { relaunch } = await import('@tauri-apps/plugin-process');
        await relaunch();
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Plugin absent de l'hôte : fonctionnalité non activée dans cette version.
    if (/not (?:found|allowed)|plugin updater/iu.test(message)) return { status: 'unconfigured' };
    logger.warn('updates.check', error);
    return { status: 'error', message };
  }
}
