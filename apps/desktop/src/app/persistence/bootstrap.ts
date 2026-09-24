import { useSettings } from '../../store/settings.js';
import { isTauri } from '../platform/runtime.js';
import { logger } from '../platform/logger.js';
import { IndexedDbProjectStore, MemoryProjectStore, type ProjectStore } from './projectStore.js';
import { PersistentProjects } from './persistentProjects.js';

/**
 * Délai de regroupement issu du réglage « enregistrement automatique ». Même en
 * mode immédiat, les frappes d'un même geste sont regroupées sur 300 ms : écrire
 * un projet de plusieurs centaines de Ko à chaque touche gelait la saisie.
 */
export const IMMEDIATE_SAVE_GROUPING_MS = 300;
function autosaveDelayMs(): number {
  const projects = useSettings.getState().projects;
  return projects.autosaveStrategy === 'debounced' ? Math.max(IMMEDIATE_SAVE_GROUPING_MS, projects.autosaveDebounceMs) : IMMEDIATE_SAVE_GROUPING_MS;
}

async function selectStore(): Promise<ProjectStore> {
  if (isTauri()) {
    const { TauriSqliteProjectStore } = await import('../platform/tauriProjectStore.js');
    return new TauriSqliteProjectStore();
  }
  if (typeof indexedDB !== 'undefined') return new IndexedDbProjectStore();
  logger.warn('persistence.memory', 'IndexedDB indisponible : les projets ne survivront pas au rechargement.');
  return new MemoryProjectStore();
}

/**
 * Ouvre la session projet durable avant le premier rendu, et vide la file
 * d'écriture avant la fermeture de la fenêtre.
 */
export async function openProjectService(): Promise<PersistentProjects> {
  const store = await selectStore();
  const service = await PersistentProjects.open(store, { debounceMs: autosaveDelayMs });
  const state = service.getSaveState();
  if (state.unreadable > 0) logger.warn('persistence.unreadable', `${state.unreadable} projet(s) illisible(s) conservé(s) dans le dépôt`);
  window.addEventListener('beforeunload', (event) => {
    if (!service.hasPendingWrites()) return;
    void service.flushNow();
    event.preventDefault();
  });
  window.addEventListener('pagehide', () => { void service.flushNow(); });
  return service;
}
