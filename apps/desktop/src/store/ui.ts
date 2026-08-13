/** État d'interface : thème, langue, notifications, confirmations. */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
/**
 * Intensité visuelle. Trois propositions à départager :
 *   sober   — l'instrument de mesure, tout en contraste et en densité
 *   vivid   — la charte assumée, chrome sombre, surfaces colorées
 *   radiant — le blanc éclairé : profondeur, halos, un grand chiffre
 */
export type Vibe = 'sober' | 'vivid' | 'radiant';

export const VIBES: Vibe[] = ['sober', 'vivid', 'radiant'];
export type Lang = 'fr' | 'en';

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'warning' | 'error';
  title: string;
  detail?: string;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

/**
 * Ce qui a réellement tourné, et quand.
 *
 * Le logiciel Python ne recalcule jamais à la frappe : le prédimensionnement
 * balaie 121 combinaisons de 8 760 pas horaires, le dimensionnement teste
 * toute la base d'onduleurs. Les deux passent par un `Worker` déclenché à la
 * main, et `_mark_results_stale` se contente de signaler que ce qui est à
 * l'écran ne correspond plus aux entrées.
 *
 * Cet état est volontairement hors du projet : il décrit une session de
 * travail, pas une donnée d'étude. Il n'est pas persisté — rouvrir le logiciel
 * revient à n'avoir rien lancé, exactement comme dans PyQt.
 */
export type RunKind = 'presizing' | 'sizing';

export interface RunState {
  presizedAt: number | null;
  sizedAt: number | null;
  /** Un calcul est déjà passé dans cette session : il y a quelque chose à
      périmer. Avant, il n'y a rien du tout, et l'écran doit le dire. */
  presizedOnce: boolean;
  sizedOnce: boolean;
}

const NO_RUN: RunState = {
  presizedAt: null,
  sizedAt: null,
  presizedOnce: false,
  sizedOnce: false,
};

interface UiStore {
  theme: Theme;
  vibe: Vibe;
  lang: Lang;
  splashSeen: boolean;
  toasts: Toast[];
  confirm: ConfirmRequest | null;
  verdictCollapsed: boolean;
  /** Position verticale de l'encoche de réouverture, en % de la hauteur. */
  verdictTabTop: number;
  lastComputeMs: number;
  /** Par projet : les calculs lourds déjà passés. */
  runs: Record<string, RunState>;

  setTheme: (t: Theme) => void;
  setVibe: (v: Vibe) => void;
  toggleVibe: () => void;
  toggleTheme: () => void;
  setLang: (l: Lang) => void;
  markSplashSeen: () => void;
  notify: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
  ask: (r: ConfirmRequest) => void;
  closeConfirm: () => void;
  toggleVerdict: () => void;
  setVerdictTabTop: (pct: number) => void;
  setComputeMs: (ms: number) => void;
  /** Le calcul vient de tourner : ses résultats font foi. */
  markRun: (projectId: string, kind: RunKind) => void;
  /** Une entrée a changé : les résultats restent à l'écran, mais périmés. */
  invalidateRun: (projectId: string, kind: RunKind) => void;
}

let toastSeq = 0;

export const useUi = create<UiStore>()(
  persist(
    (set) => ({
      theme: 'light',
      vibe: 'sober',
      lang: 'fr',
      splashSeen: false,
      toasts: [],
      confirm: null,
      verdictCollapsed: false,
      verdictTabTop: 42,
      lastComputeMs: 0,
      runs: {},

      setTheme: (theme) => set({ theme }),
      setVibe: (vibe) => set({ vibe }),
      // Trois styles en lice : la bascule les fait défiler en boucle.
      toggleVibe: () =>
        set((s) => ({ vibe: VIBES[(VIBES.indexOf(s.vibe) + 1) % VIBES.length] })),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
      setLang: (lang) => set({ lang }),
      markSplashSeen: () => set({ splashSeen: true }),

      notify: (t) => {
        const id = ++toastSeq;
        set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
        setTimeout(
          () => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
          4200,
        );
      },
      dismiss: (id) =>
        set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),

      ask: (confirm) => set({ confirm }),
      closeConfirm: () => set({ confirm: null }),
      toggleVerdict: () => set((s) => ({ verdictCollapsed: !s.verdictCollapsed })),
      /* Bornée pour que l'encoche ne sorte jamais sous la barre d'état ni
         au-dessus de la barre du haut. */
      setVerdictTabTop: (pct) =>
        set({ verdictTabTop: Math.min(88, Math.max(6, pct)) }),
      setComputeMs: (ms) => set({ lastComputeMs: ms }),

      markRun: (projectId, kind) =>
        set((s) => ({
          runs: {
            ...s.runs,
            [projectId]: {
              ...(s.runs[projectId] ?? NO_RUN),
              ...(kind === 'presizing'
                ? { presizedAt: Date.now(), presizedOnce: true }
                : { sizedAt: Date.now(), sizedOnce: true }),
            },
          },
        })),

      /* Le prédimensionnement fixe les minimums que le dimensionnement doit
         couvrir : le périmer périme forcément ce qui a été monté dessus. */
      invalidateRun: (projectId, kind) =>
        set((s) => {
          const cur = s.runs[projectId] ?? NO_RUN;
          const next: RunState =
            kind === 'presizing'
              ? { ...cur, presizedAt: null, sizedAt: null }
              : { ...cur, sizedAt: null };
          return { runs: { ...s.runs, [projectId]: next } };
        }),
    }),
    {
      name: 'ksd-ui',
      partialize: (s) => ({
        theme: s.theme,
        vibe: s.vibe,
        lang: s.lang,
        verdictCollapsed: s.verdictCollapsed,
      }),
    },
  ),
);

/** L'état des calculs d'un projet, jamais `undefined`. */
export const useRuns = (projectId: string): RunState =>
  useUi((s) => s.runs[projectId]) ?? NO_RUN;
