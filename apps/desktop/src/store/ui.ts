/** État d'interface éphémère : thème, langue, notifications et confirmations. */
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Vibe = 'sober' | 'vivid' | 'radiant';
export const VIBES: readonly Vibe[] = ['sober', 'vivid', 'radiant'];
export type Lang = 'fr' | 'en';

export interface Toast {
  readonly id: number;
  readonly kind: 'info' | 'success' | 'warning' | 'error';
  readonly title: string;
  readonly detail?: string;
}
export interface ConfirmRequest {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly danger?: boolean;
  readonly onConfirm: () => void;
}
interface UiStore {
  theme: Theme;
  vibe: Vibe;
  lang: Lang;
  splashSeen: boolean;
  toasts: Toast[];
  confirm: ConfirmRequest | null;
  verdictCollapsed: boolean;
  verdictTabTop: number;
  setTheme: (theme: Theme) => void;
  setVibe: (vibe: Vibe) => void;
  toggleVibe: () => void;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
  markSplashSeen: () => void;
  notify: (toast: Omit<Toast, 'id'>) => void;
  dismiss: (id: number) => void;
  ask: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
  toggleVerdict: () => void;
  setVerdictTabTop: (percent: number) => void;
}

let toastSequence = 0;
export const useUi = create<UiStore>()((set) => ({
  theme: 'light', vibe: 'sober', lang: 'fr', splashSeen: false, toasts: [],
  confirm: null, verdictCollapsed: false, verdictTabTop: 42,
  setTheme: (theme) => set({ theme }),
  setVibe: (vibe) => set({ vibe }),
  toggleVibe: () => set((state) => ({ vibe: VIBES[(VIBES.indexOf(state.vibe) + 1) % VIBES.length] })),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
  setLang: (lang) => set({ lang }),
  markSplashSeen: () => set({ splashSeen: true }),
  notify: (toast) => {
    const id = ++toastSequence;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })), 4200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  ask: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
  toggleVerdict: () => set((state) => ({ verdictCollapsed: !state.verdictCollapsed })),
  setVerdictTabTop: (percent) => set({ verdictTabTop: Math.min(88, Math.max(6, percent)) }),
}));
