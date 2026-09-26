import { logger } from './logger.js';
import { isTauri } from './runtime.js';

/*
 * « Signaler un problème » passe désormais par la plateforme (spec 012, FR-F3) : voir
 * `app/feedback/usage.ts` et la boîte « Donner un avis ». Restent ici les accès au poste.
 */

/** Ouvre le dossier des journaux (hôte Tauri uniquement). */
export async function openLogFolder(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const [{ appLogDir }, { openPath }] = await Promise.all([import('@tauri-apps/api/path'), import('@tauri-apps/plugin-opener')]);
    await openPath(await appLogDir());
    return true;
  } catch (error) { logger.warn('support.logFolder', error); return false; }
}

/** Ouvre une page web (plateforme KYA-EnergyMarket) dans le navigateur du poste. */
export async function openExternal(url: string | null): Promise<boolean> {
  if (!url) return false;
  try {
    if (isTauri()) {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
    return true;
  } catch (error) { logger.warn('support.openExternal', error); return false; }
}
