import { logger } from './logger.js';
import { isTauri } from './runtime.js';
import { applicationReleaseInfo } from '../models/releaseInfo.js';

/**
 * Branche les services de l'hôte avant le premier rendu. Dans le navigateur de
 * développement, rien n'est installé : le journal reste en mémoire.
 */
export async function installPlatform(): Promise<void> {
  if (!isTauri()) return;
  try {
    const log = await import('@tauri-apps/plugin-log');
    logger.setSink((entry) => {
      const line = `${entry.message}${entry.detail ? ` — ${entry.detail}` : ''}`;
      void (entry.level === 'error' ? log.error(line) : entry.level === 'warn' ? log.warn(line) : log.info(line));
    });
  } catch (error) {
    logger.warn('platform.log', error);
  }
  logger.info('startup', `KYA-SolDesign ${applicationReleaseInfo.version}`);
}
