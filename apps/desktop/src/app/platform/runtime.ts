/** Vrai dans l'hôte Tauri (WebView2), faux dans un navigateur de développement. */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

const env = import.meta.env as Record<string, string | undefined>;

/** Adresse du support éditeur, fixée à la construction ; absente, le rapport est copié. */
export const SUPPORT_EMAIL = env.VITE_SUPPORT_EMAIL?.trim() || null;
