import { applicationReleaseInfo } from '../models/releaseInfo.js';

export interface LogEntry {
  readonly at: string;
  readonly level: 'error' | 'warn' | 'info';
  readonly message: string;
  readonly detail?: string;
}

type Sink = (entry: LogEntry) => void;

const LIMIT = 200;
const buffer: LogEntry[] = [];
let sink: Sink | null = null;

function record(level: LogEntry['level'], message: string, detail?: unknown): void {
  const entry: LogEntry = { at: new Date().toISOString(), level, message, ...(detail === undefined ? {} : { detail: describe(detail) }) };
  buffer.push(entry);
  if (buffer.length > LIMIT) buffer.shift();
  try { sink?.(entry); } catch { /* le journal ne doit jamais faire échouer l'application */ }
  if (level === 'error') console.error(message, detail);
}

/**
 * Journal applicatif : tampon en mémoire pour le rapport de diagnostic, et
 * relais vers le fichier journal de l'hôte Tauri quand il est présent.
 */
export const logger = {
  error: (message: string, detail?: unknown) => record('error', message, detail),
  warn: (message: string, detail?: unknown) => record('warn', message, detail),
  info: (message: string, detail?: unknown) => record('info', message, detail),
  entries: (): readonly LogEntry[] => [...buffer],
  setSink: (next: Sink | null) => { sink = next; },
};

export function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? `\n${value.stack}` : ''}`;
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}

/** Erreurs non rattrapées : journalisées puis signalées à l'interface. */
export function installGlobalErrorHandlers(onError: (message: string) => void): () => void {
  const onWindowError = (event: ErrorEvent) => { logger.error('window.error', event.error ?? event.message); onError(event.message); };
  const onRejection = (event: PromiseRejectionEvent) => { logger.error('unhandledrejection', event.reason); onError(describe(event.reason).split('\n')[0] ?? ''); };
  window.addEventListener('error', onWindowError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => { window.removeEventListener('error', onWindowError); window.removeEventListener('unhandledrejection', onRejection); };
}

/** Rapport joint à un signalement : version, environnement et derniers événements, sans données projet. */
export function diagnosticReport(context: readonly string[] = []): string {
  const lines = [
    `KYA-SolDesign ${applicationReleaseInfo.version} (${applicationReleaseInfo.channel})`,
    `Build: ${applicationReleaseInfo.builtAtIso ?? '—'}`,
    `User agent: ${typeof navigator === 'undefined' ? '—' : navigator.userAgent}`,
    `Date: ${new Date().toISOString()}`,
    ...context,
    '',
    ...buffer.slice(-50).map((entry) => `${entry.at} [${entry.level}] ${entry.message}${entry.detail ? ` — ${entry.detail}` : ''}`),
  ];
  return lines.join('\n');
}
