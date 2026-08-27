/** Préférences d'interface persistées localement, plus l'état de session UI. */
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Vibe = 'sober' | 'vivid' | 'radiant';
export const VIBES: readonly Vibe[] = ['sober', 'vivid', 'radiant'];
export type Lang = 'fr' | 'en';
const UI_SETTINGS_KEY = 'kya-sol-design.ui-settings.v1';
type UiSettings = Pick<UiStore, 'theme' | 'vibe' | 'lang'>;

function readSettings(): UiSettings {
  if (typeof window === 'undefined') return { theme: 'light', vibe: 'sober', lang: 'fr' };
  try {
    const value = JSON.parse(window.localStorage.getItem(UI_SETTINGS_KEY) ?? 'null') as Partial<UiSettings> | null;
    return { theme: value?.theme === 'dark' ? 'dark' : 'light', vibe: VIBES.includes(value?.vibe as Vibe) ? value!.vibe as Vibe : 'sober', lang: value?.lang === 'en' ? 'en' : 'fr' };
  } catch { return { theme: 'light', vibe: 'sober', lang: 'fr' }; }
}

function saveSettings(settings: UiSettings): void {
  try { window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage unavailable: session state remains usable */ }
}

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
const initialSettings = readSettings();
export const useUi = create<UiStore>()((set, get) => ({
  ...initialSettings, splashSeen: false, toasts: [],
  confirm: null, verdictCollapsed: false, verdictTabTop: 42,
  setTheme: (theme) => { set({ theme }); saveSettings({ theme, vibe: get().vibe, lang: get().lang }); },
  setVibe: (vibe) => { set({ vibe }); saveSettings({ theme: get().theme, vibe, lang: get().lang }); },
  toggleVibe: () => { const vibe = VIBES[(VIBES.indexOf(get().vibe) + 1) % VIBES.length]; set({ vibe }); saveSettings({ theme: get().theme, vibe, lang: get().lang }); },
  toggleTheme: () => { const theme = get().theme === 'dark' ? 'light' : 'dark'; set({ theme }); saveSettings({ theme, vibe: get().vibe, lang: get().lang }); },
  setLang: (lang) => { set({ lang }); saveSettings({ theme: get().theme, vibe: get().vibe, lang }); },
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
