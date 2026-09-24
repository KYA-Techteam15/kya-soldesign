import { logger } from './logger.js';
import { isTauri } from './runtime.js';

export interface IncomingProjectFile { readonly path: string; readonly text: string }

let startupConsumed = false;

/**
 * Fichiers `.ksd` ouverts depuis l'explorateur Windows : celui du lancement,
 * puis ceux transmis par l'instance unique quand l'application tourne déjà.
 * Hors de Tauri, rien n'arrive par ce canal.
 */
export function listenForProjectFiles(onFile: (file: IncomingProjectFile) => void): () => void {
  if (!isTauri()) return () => undefined;
  let disposed = false;
  let unlisten: (() => void) | null = null;
  const read = async (path: string) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const text = await invoke<string>('read_project_file', { path });
      if (!disposed) onFile({ path, text });
    } catch (error) { logger.error('projectFile.read', error); }
  };
  void (async () => {
    const [{ invoke }, { listen }] = await Promise.all([import('@tauri-apps/api/core'), import('@tauri-apps/api/event')]);
    if (!startupConsumed) {
      startupConsumed = true;
      const path = await invoke<string | null>('startup_project_file');
      if (path) await read(path);
    }
    const stop = await listen<string>('open-project-file', (event) => { void read(event.payload); });
    if (disposed) stop(); else unlisten = stop;
  })();
  return () => { disposed = true; unlisten?.(); };
}
