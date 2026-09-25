import { diagnosticReport, logger } from './logger.js';
import { diagnosticContext } from './diagnostics.js';
import { isTauri, SUPPORT_EMAIL } from './runtime.js';

export type ReportOutcome = 'mail-opened' | 'copied' | 'failed';

/**
 * « Signaler un problème » : prépare un courriel au support avec le rapport de
 * diagnostic (sans données projet). Sans adresse configurée, le rapport est
 * copié pour être transmis par le canal habituel.
 */
export async function reportProblem(context: { readonly projectCount?: number; readonly lang?: string } = {}): Promise<ReportOutcome> {
  const report = diagnosticReport(diagnosticContext(context));
  if (SUPPORT_EMAIL !== null) {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('KYA-SolDesign — signalement')}&body=${encodeURIComponent(report.slice(0, 1800))}`;
    try {
      if (isTauri()) { const { openUrl } = await import('@tauri-apps/plugin-opener'); await openUrl(url); } else window.location.href = url;
      return 'mail-opened';
    } catch (error) { logger.warn('support.mailto', error); }
  }
  try { await navigator.clipboard.writeText(report); return 'copied'; } catch (error) { logger.warn('support.clipboard', error); return 'failed'; }
}

/** Ouvre le dossier des journaux (hôte Tauri uniquement). */
export async function openLogFolder(): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const [{ appLogDir }, { openPath }] = await Promise.all([import('@tauri-apps/api/path'), import('@tauri-apps/plugin-opener')]);
    await openPath(await appLogDir());
    return true;
  } catch (error) { logger.warn('support.logFolder', error); return false; }
}
