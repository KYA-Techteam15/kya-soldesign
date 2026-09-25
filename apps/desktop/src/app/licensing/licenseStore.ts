import { create } from 'zustand';
import type { FeatureId } from './features.js';
import { isEntitled, type KeyValueStore, type LicenseService, type LicenseView } from './licenseService.js';

/**
 * Licence du poste, partagée par l'interface et les services (spec 012, FR-D4).
 *
 * `main.tsx` l'évalue avant le premier rendu : l'application ne s'affiche jamais avec une licence
 * inconnue. `view` n'est `null` que hors application (tests de composants), où tout est permis.
 */
interface LicenseStore {
  readonly view: LicenseView | null;
  readonly busy: boolean;
  readonly start: (service: LicenseService) => Promise<void>;
  /** Code d'erreur de la plateforme, ou `null` si la clé est acceptée. */
  readonly activate: (key: string) => Promise<string | null>;
  readonly refresh: () => Promise<string | null>;
  readonly release: () => Promise<void>;
  /** Recalcule l'état (jours restants, fin de grâce) sans appeler la plateforme. */
  readonly reevaluate: () => Promise<void>;
}

let service: LicenseService | null = null;

export const useLicense = create<LicenseStore>((set) => {
  const run = async (action: (current: LicenseService) => Promise<LicenseView | { readonly error: string }>): Promise<string | null> => {
    if (service === null) return 'LICENSING_UNAVAILABLE';
    set({ busy: true });
    try {
      const result = await action(service);
      if ('error' in result) {
        set({ view: await service.load() });
        return result.error;
      }
      set({ view: result });
      return result.status === 'invalid' ? 'LICENSE_INVALID' : null;
    } catch {
      return 'PLATFORM_UNREACHABLE';
    } finally {
      set({ busy: false });
    }
  };
  return {
    view: null,
    busy: false,
    start: async (next) => {
      service = next;
      set({ view: await next.load() });
    },
    activate: (key) => run((current) => current.activate(key)),
    refresh: () => run((current) => current.refresh()),
    release: async () => { await run((current) => current.release()); },
    reevaluate: async () => { if (service !== null) set({ view: await service.load() }); },
  };
});

export function useEntitlement(feature: FeatureId): boolean {
  return useLicense((state) => state.view === null || isEntitled(state.view, feature));
}

/** Lecture seule imposée par la licence (échue, hors ligne trop longtemps, horloge reculée, absente). */
export function useLicenseReadOnly(): boolean {
  return useLicense((state) => state.view?.readOnly === true);
}

/** Même règle, hors composant : pour les services et les fournisseurs. */
export function licenseAllows(feature: FeatureId): boolean {
  const view = useLicense.getState().view;
  return view === null || isEntitled(view, feature);
}

export function licenseReadOnly(): boolean {
  return useLicense.getState().view?.readOnly === true;
}

/** Nombre de projets encore permis, `null` sans limite. */
export function projectQuotaLeft(count: number): number | null {
  const max = useLicense.getState().view?.limits.maxProjects ?? null;
  return max === null ? null : Math.max(0, max - count);
}

/** `localStorage` quand il répond, sinon une table en mémoire pour la séance. */
export function browserStore(): KeyValueStore {
  const memory = new Map<string, string>();
  return {
    getItem: (key) => { try { return window.localStorage.getItem(key); } catch { return memory.get(key) ?? null; } },
    setItem: (key, value) => { try { window.localStorage.setItem(key, value); } catch { memory.set(key, value); } },
    removeItem: (key) => { try { window.localStorage.removeItem(key); } catch { memory.delete(key); } },
  };
}
