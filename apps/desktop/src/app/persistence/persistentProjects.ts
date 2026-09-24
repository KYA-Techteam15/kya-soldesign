import type { SystemKind } from '@ksd/domain';
import { parseProjectFile, type ProjectFileV1 } from '@ksd/project-format';
import { createEmptyProjectFile } from '../models/projectAdapters.js';
import type { ProjectSessionPort, UiLocale } from '../contracts.js';
import type { ProjectStore, StoredProjectRecord } from './projectStore.js';

export const LEGACY_PROJECTS_KEY = 'kya-sol-design.projects.v1';

export interface SaveState {
  readonly status: 'saved' | 'saving' | 'error';
  readonly pending: number;
  readonly lastSavedAt: number | null;
  readonly error: string | null;
  /** Enregistrements illisibles écartés au chargement, jamais supprimés du dépôt. */
  readonly unreadable: number;
}

interface Options {
  readonly now?: () => string;
  readonly createId?: () => string;
  /** Délai de regroupement des écritures ; relu à chaque planification (réglage utilisateur). */
  readonly debounceMs?: () => number;
}

type LegacyStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/**
 * Session projet synchrone en lecture, durable en écriture.
 *
 * Les écrans lisent un cache mémoire ; chaque modification planifie l'écriture
 * du seul projet concerné. Une écriture refusée reste en attente et l'état
 * « error » est publié : aucune modification n'est perdue en silence.
 */
export class PersistentProjects implements ProjectSessionPort {
  private projects: ProjectFileV1[];
  private readonly pending = new Map<string, ProjectFileV1 | null>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing: Promise<void> | null = null;
  private readonly listeners = new Set<() => void>();
  private state: SaveState;
  private readonly now: () => string;
  private readonly createId: () => string;
  private readonly debounceMs: () => number;

  private constructor(private readonly store: ProjectStore, projects: ProjectFileV1[], unreadable: number, options: Options) {
    this.projects = projects;
    this.now = options.now ?? (() => new Date().toISOString());
    this.createId = options.createId ?? (() => crypto.randomUUID());
    this.debounceMs = options.debounceMs ?? (() => 0);
    this.state = { status: 'saved', pending: 0, lastSavedAt: null, error: null, unreadable };
  }

  /** Charge le dépôt, puis y migre une seule fois les projets de l'ancien stockage localStorage. */
  public static async open(store: ProjectStore, options: Options & { readonly legacy?: LegacyStorage | null } = {}): Promise<PersistentProjects> {
    const records = await store.loadAll();
    let unreadable = 0;
    const projects: ProjectFileV1[] = [];
    for (const record of records) {
      try { projects.push(parseProjectFile(JSON.parse(record.json))); } catch { unreadable += 1; }
    }
    const legacy = options.legacy === undefined ? safeLocalStorage() : options.legacy;
    const migrated = legacy ? readLegacy(legacy).filter((candidate) => !projects.some((project) => project.id === candidate.id)) : [];
    for (const project of migrated) await store.put(toRecord(project));
    if (legacy && legacy.getItem(LEGACY_PROJECTS_KEY) !== null) {
      // Conservé sous un autre nom : la migration reste réversible.
      legacy.setItem(`${LEGACY_PROJECTS_KEY}.migrated`, legacy.getItem(LEGACY_PROJECTS_KEY)!);
      legacy.removeItem(LEGACY_PROJECTS_KEY);
    }
    const all = [...projects, ...migrated].toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
    return new PersistentProjects(store, all, unreadable, options);
  }

  public list(): readonly ProjectFileV1[] { return this.projects; }
  public get(id: string): ProjectFileV1 | null { return this.projects.find((project) => project.id === id) ?? null; }

  public create(system: SystemKind, locale: UiLocale): ProjectFileV1 {
    const project = createEmptyProjectFile(this.createId(), system, this.now(), locale === 'fr' ? 'Nouveau projet' : 'New project');
    this.projects = [project, ...this.projects];
    this.schedule(project.id, project);
    return project;
  }

  public add(project: ProjectFileV1): void {
    const checked = parseProjectFile(project);
    if (this.projects.some((current) => current.id === checked.id)) throw new Error('PROJECT_ALREADY_EXISTS');
    this.projects = [checked, ...this.projects];
    this.schedule(checked.id, checked);
  }

  public replace(project: ProjectFileV1): void {
    const checked = parseProjectFile(project);
    const index = this.projects.findIndex((current) => current.id === checked.id);
    if (index < 0) { this.projects = [checked, ...this.projects]; this.schedule(checked.id, checked); return; }
    this.projects = this.projects.with(index, checked);
    this.schedule(checked.id, checked);
  }

  public remove(id: string): void {
    this.projects = this.projects.filter((project) => project.id !== id);
    this.schedule(id, null);
  }

  public subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  public getSaveState = (): SaveState => this.state;

  /** Réessaie les écritures en attente (bouton « Réessayer »). */
  public retry(): Promise<void> { return this.flush(); }

  /** Vide la file immédiatement ; attendu avant fermeture de la fenêtre. */
  public async flushNow(): Promise<void> {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    await this.flush();
  }

  public hasPendingWrites(): boolean { return this.pending.size > 0; }

  private schedule(id: string, project: ProjectFileV1 | null): void {
    this.pending.set(id, project);
    this.publish({ status: this.state.status === 'error' ? 'error' : 'saving', pending: this.pending.size });
    if (this.timer !== null) clearTimeout(this.timer);
    const delay = Math.max(0, this.debounceMs());
    this.timer = setTimeout(() => { this.timer = null; void this.flush(); }, delay);
  }

  private flush(): Promise<void> {
    if (this.flushing) return this.flushing.then(() => (this.pending.size > 0 ? this.flush() : undefined));
    this.flushing = (async () => {
      let failure: string | null = null;
      // Instantané : une modification qui arrive pendant une écriture attend le passage suivant.
      for (const [id, project] of Array.from(this.pending)) {
        try {
          if (project === null) await this.store.remove(id); else await this.store.put(toRecord(project));
          // Une modification arrivée pendant l'écriture reste en attente.
          if (this.pending.get(id) === project) this.pending.delete(id);
        } catch (error) {
          failure = error instanceof Error ? error.message : 'STORE_WRITE_FAILED';
        }
      }
      this.publish(failure === null
        ? { status: this.pending.size > 0 ? 'saving' : 'saved', pending: this.pending.size, lastSavedAt: Date.now(), error: null }
        : { status: 'error', pending: this.pending.size, error: failure });
    })().finally(() => { this.flushing = null; });
    return this.flushing;
  }

  private publish(patch: Partial<SaveState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}

function toRecord(project: ProjectFileV1): StoredProjectRecord {
  return { id: project.id, json: JSON.stringify(project), updatedAt: project.updatedAt };
}

function readLegacy(storage: LegacyStorage): ProjectFileV1[] {
  try {
    const raw = storage.getItem(LEGACY_PROJECTS_KEY);
    if (raw === null) return [];
    const stored = JSON.parse(raw) as { version?: number; projects?: unknown[] };
    if (stored.version !== 1 || !Array.isArray(stored.projects)) return [];
    return stored.projects.flatMap((candidate) => { try { return [parseProjectFile(candidate)]; } catch { return []; } });
  } catch { return []; }
}

function safeLocalStorage(): LegacyStorage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
