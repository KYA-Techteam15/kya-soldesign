import { create } from 'zustand';
import { applicationReleaseInfo } from '../models/releaseInfo.js';
import { useLicense } from '../licensing/licenseStore.js';
import { logger } from '../platform/logger.js';
import type { FeedbackDraft, FeedbackKind, FeedbackThread, UsageApi, UsageEvent, UsageEventName, UsageProps } from './usageApi.js';

/**
 * Usage anonyme et avis (spec 012, FR-F1 → FR-F3).
 *
 * - Rien ne part sans consentement : tant que l'utilisateur n'a pas répondu, les événements ne
 *   sont même pas mis en file ; un refus vide la file.
 * - Un identifiant d'installation tiré au hasard regroupe les événements ; il ne dit rien de la
 *   personne ni du poste.
 * - La file est bornée et envoyée par lots, au démarrage puis toutes les cinq minutes, en ligne.
 * - Les avis partent quel que soit le consentement : les envoyer est un geste explicite.
 */
export type Consent = 'granted' | 'denied' | null;

const KEYS = { consent: 'ksd.usage.consent', queue: 'ksd.usage.queue', installation: 'ksd.usage.installation' } as const;
const QUEUE_LIMIT = 500;
const BATCH_SIZE = 100;
const FLUSH_EVERY = 5 * 60_000;

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string | null): void {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* sans stockage, la séance suffit */ }
}

function readConsent(): Consent {
  const value = read(KEYS.consent);
  return value === 'granted' || value === 'denied' ? value : null;
}

function readQueue(): UsageEvent[] {
  try { return JSON.parse(read(KEYS.queue) ?? '[]') as UsageEvent[]; } catch { return []; }
}

export function installationId(): string {
  const known = read(KEYS.installation);
  if (known) return known;
  const created = crypto.randomUUID();
  write(KEYS.installation, created);
  return created;
}

interface UsageStore {
  readonly consent: Consent;
  readonly threads: readonly FeedbackThread[];
  /** Boîte « Donner un avis » ouverte, et sur quel type. */
  readonly composing: FeedbackKind | null;
  readonly setConsent: (consent: 'granted' | 'denied') => void;
  readonly compose: (kind: FeedbackKind) => void;
  readonly closeComposer: () => void;
  readonly submit: (draft: FeedbackDraft) => Promise<boolean>;
  readonly refreshThreads: () => Promise<void>;
}

let api: UsageApi | null = null;
let lang: () => string = () => 'fr';

export const useUsage = create<UsageStore>((set) => ({
  consent: readConsent(),
  threads: [],
  composing: null,
  setConsent: (consent) => {
    write(KEYS.consent, consent);
    if (consent === 'denied') write(KEYS.queue, null);
    set({ consent });
  },
  compose: (kind) => set({ composing: kind }),
  closeComposer: () => set({ composing: null }),
  submit: async (draft) => {
    if (api === null) return false;
    try {
      await api.sendFeedback(installationId(), draft);
      track('feedback.sent', { kind: draft.kind });
      set({ threads: await api.listFeedback(installationId()), composing: null });
      return true;
    } catch (error) {
      logger.warn('feedback.send', error);
      return false;
    }
  },
  refreshThreads: async () => {
    if (api === null) return;
    try { set({ threads: await api.listFeedback(installationId()) }); } catch (error) { logger.warn('feedback.list', error); }
  },
}));

/** Met un événement en file, si l'utilisateur l'a accepté. */
export function track(name: UsageEventName, props: UsageProps = {}): void {
  if (useUsage.getState().consent !== 'granted') return;
  const queue = readQueue();
  queue.push({ name, at: new Date().toISOString(), props });
  write(KEYS.queue, JSON.stringify(queue.slice(-QUEUE_LIMIT)));
}

/** Envoie la file par lots ; ce qui n'a pas pu partir reste pour la prochaine fois. */
export async function flushUsage(): Promise<void> {
  if (api === null || useUsage.getState().consent !== 'granted') return;
  // Hors ligne seulement si le navigateur le dit : sans information, on tente l'envoi.
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  let queue = readQueue();
  while (queue.length > 0) {
    const events = queue.slice(0, BATCH_SIZE);
    try {
      await api.sendEvents({ installationId: installationId(), version: applicationReleaseInfo.version, edition: useLicense.getState().view?.payload?.edition ?? null, lang: lang(), events });
    } catch (error) {
      logger.warn('usage.flush', error);
      return;
    }
    queue = queue.slice(events.length);
    write(KEYS.queue, JSON.stringify(queue));
  }
}

/** Démarrage : branche l'API, compte le lancement, envoie la file puis la renvoie régulièrement. */
export function startUsage(client: UsageApi, currentLang: () => string): () => void {
  api = client;
  lang = currentLang;
  track('app.start');
  void flushUsage();
  void useUsage.getState().refreshThreads();
  const timer = window.setInterval(() => { void flushUsage(); }, FLUSH_EVERY);
  const online = () => { void flushUsage(); };
  window.addEventListener('online', online);
  return () => { window.clearInterval(timer); window.removeEventListener('online', online); };
}

/** Pour les tests : l'API sans démarrage. */
export function setUsageApiForTests(client: UsageApi | null): void {
  api = client;
}

export function pendingUsageEvents(): readonly UsageEvent[] {
  return readQueue();
}
