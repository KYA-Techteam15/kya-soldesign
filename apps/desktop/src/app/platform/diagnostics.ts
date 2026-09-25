import { useLicense } from '../licensing/licenseStore.js';
import { diagnosticReport, logger } from './logger.js';
import { isTauri } from './runtime.js';
import { readUpdateChannel } from './updates.js';

/**
 * Informations de diagnostic (spec 012, FR-E3) : ce qu'il faut au support pour reproduire un
 * problème — version, hôte, licence, langue, écran — et les derniers événements du journal.
 * Aucune donnée de projet : ni nom, ni client, ni chiffre.
 */
export function diagnosticContext({ projectCount, lang }: { readonly projectCount?: number; readonly lang?: string } = {}): string[] {
  const view = useLicense.getState().view;
  const payload = view?.payload ?? null;
  const screenSize = typeof window === 'undefined' ? '—' : `${window.screen.width}×${window.screen.height} @${window.devicePixelRatio}`;
  return [
    `Host: ${isTauri() ? 'desktop (Tauri)' : 'browser'}`,
    `Update channel: ${readUpdateChannel()}`,
    `License: ${payload ? `${payload.edition} ${payload.plan} · ${view?.status ?? '—'} · ${view?.remainingDays ?? '—'} d · ${payload.licenseId}` : view?.status ?? '—'}`,
    `Language: ${lang ?? '—'}`,
    `Projects: ${projectCount ?? '—'}`,
    `Screen: ${screenSize}`,
    `Online: ${typeof navigator === 'undefined' ? '—' : String(navigator.onLine)}`,
  ];
}

/** « Copier les infos de diagnostic » : le rapport complet dans le presse-papiers. */
export async function copyDiagnostics(context: { readonly projectCount?: number; readonly lang?: string } = {}): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(diagnosticReport(diagnosticContext(context)));
    return true;
  } catch (error) {
    logger.warn('diagnostics.copy', error);
    return false;
  }
}
