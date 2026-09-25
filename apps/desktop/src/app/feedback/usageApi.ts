/**
 * API de la plateforme d'administration, côté usage et avis (spec 012, lot F).
 *
 * `SimulatedUsageApi` la joue localement tant que la plateforme n'expose pas son API : les
 * événements et les avis y sont conservés comme ils le seront côté serveur, pour les statistiques
 * et le suivi des retours. La remplacer par une version HTTP ne change rien aux écrans.
 */

/** Événements d'usage : des noms fermés, des propriétés courtes, jamais de contenu de projet. */
export type UsageEventName =
  | 'app.start'
  | 'project.create'
  | 'document.print'
  | 'document.word'
  | 'license.activate'
  | 'license.blocked'
  | 'feedback.sent';

export type UsageProps = Readonly<Record<string, string | number | boolean>>;

export interface UsageEvent {
  readonly name: UsageEventName;
  readonly at: string;
  readonly props: UsageProps;
}

/** Contexte commun d'un lot : de quoi agréger par version, édition et langue. */
export interface UsageBatch {
  readonly installationId: string;
  readonly version: string;
  readonly edition: string | null;
  readonly lang: string;
  readonly events: readonly UsageEvent[];
}

export type FeedbackKind = 'idea' | 'problem' | 'question';
export type FeedbackStatus = 'received' | 'in-progress' | 'answered' | 'closed';

export interface FeedbackReply {
  readonly at: string;
  readonly author: string;
  readonly text: string;
}

export interface FeedbackThread {
  readonly id: string;
  readonly kind: FeedbackKind;
  readonly message: string;
  readonly createdAt: string;
  readonly status: FeedbackStatus;
  readonly replies: readonly FeedbackReply[];
}

export interface FeedbackDraft {
  readonly kind: FeedbackKind;
  readonly message: string;
  /** Adresse de réponse, facultative. */
  readonly contact: string;
  /** Rapport de diagnostic joint (sans données de projet), pour un problème. */
  readonly diagnostics: string | null;
}

export interface UsageApi {
  sendEvents(batch: UsageBatch): Promise<void>;
  sendFeedback(installationId: string, draft: FeedbackDraft): Promise<FeedbackThread>;
  listFeedback(installationId: string): Promise<readonly FeedbackThread[]>;
}

export interface SimulationStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const EVENTS_KEY = 'ksd.admin-sim.usage';
const FEEDBACK_KEY = 'ksd.admin-sim.feedback';
/** La simulation garde un historique borné, comme le ferait une rétention côté serveur. */
const EVENTS_KEPT = 2_000;

interface StoredFeedback extends FeedbackThread { readonly installationId: string; readonly contact: string; readonly diagnostics: string | null }

const localSimulation: SimulationStore = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => { localStorage.setItem(key, value); },
};

export class SimulatedUsageApi implements UsageApi {
  constructor(private readonly store: SimulationStore = localSimulation, private readonly clock: () => number = () => Date.now()) {}

  private read<T>(key: string): T[] {
    try { return JSON.parse(this.store.getItem(key) ?? '[]') as T[]; } catch { return []; }
  }

  private write(key: string, value: unknown): void {
    try { this.store.setItem(key, JSON.stringify(value)); } catch { /* simulation : sans stockage, l'envoi est perdu */ }
  }

  async sendEvents(batch: UsageBatch): Promise<void> {
    const received = batch.events.map((event) => ({ ...event, installationId: batch.installationId, version: batch.version, edition: batch.edition, lang: batch.lang }));
    this.write(EVENTS_KEY, [...this.read(EVENTS_KEY), ...received].slice(-EVENTS_KEPT));
  }

  async sendFeedback(installationId: string, draft: FeedbackDraft): Promise<FeedbackThread> {
    const at = new Date(this.clock()).toISOString();
    const thread: StoredFeedback = {
      id: `FB-${this.clock().toString(36).toUpperCase()}`,
      installationId,
      kind: draft.kind,
      message: draft.message,
      contact: draft.contact,
      diagnostics: draft.diagnostics,
      createdAt: at,
      status: 'received',
      // Accusé de réception de la simulation ; la plateforme réelle répond depuis son interface.
      replies: [{ at, author: 'KYA-SolDesign', text: 'Merci, votre message a bien été reçu. L’équipe vous répondra ici.' }],
    };
    this.write(FEEDBACK_KEY, [...this.read<StoredFeedback>(FEEDBACK_KEY), thread]);
    return publicThread(thread);
  }

  async listFeedback(installationId: string): Promise<readonly FeedbackThread[]> {
    return this.read<StoredFeedback>(FEEDBACK_KEY)
      .filter((thread) => thread.installationId === installationId)
      .map(publicThread)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

function publicThread({ id, kind, message, createdAt, status, replies }: StoredFeedback): FeedbackThread {
  return { id, kind, message, createdAt, status, replies };
}
