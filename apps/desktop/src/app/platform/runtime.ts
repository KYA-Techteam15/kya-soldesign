/** Vrai dans l'hôte Tauri (WebView2), faux dans un navigateur de développement. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}
