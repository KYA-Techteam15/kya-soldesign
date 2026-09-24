/** Préférences d'interface persistées localement, plus l'état de session UI. */
import { create } from 'zustand';

export type Theme = 'light' | 'dark';
export type Vibe = 'sober' | 'vivid' | 'radiant';
export const VIBES: readonly Vibe[] = ['sober', 'vivid', 'radiant'];
export type Lang = 'fr' | 'en';
const UI_SETTINGS_KEY = 'kya-sol-design.ui-settings.v1';
type UiSettings = Pick<UiStore, 'theme' | 'vibe' | 'lang' | 'verdictPreference'>;

function readSettings(): UiSettings {
  if (typeof window === 'undefined') return { theme: 'light', vibe: 'sober', lang: 'fr', verdictPreference: null };
  try {
    const value = JSON.parse(window.localStorage.getItem(UI_SETTINGS_KEY) ?? 'null') as Partial<UiSettings> | null;
    return { theme: value?.theme === 'dark' ? 'dark' : 'light', vibe: VIBES.includes(value?.vibe as Vibe) ? value!.vibe as Vibe : 'sober', lang: value?.lang === 'en' ? 'en' : 'fr', verdictPreference: value?.verdictPreference === 'open' || value?.verdictPreference === 'collapsed' ? value.verdictPreference : null };
  } catch { return { theme: 'light', vibe: 'sober', lang: 'fr', verdictPreference: null }; }
}

function saveSettings(settings: UiSettings): void {
  try { window.localStorage.setItem(UI_SETTINGS_KEY, JSON.stringify(settings)); } catch { /* storage unavailable: session state remains usable */ }
}

export interface Toast {
  readonly id: number;
  readonly kind: 'info' | 'success' | 'warning' | 'error';
  readonly title: string;
  readonly detail?: string;
  /** Action réversible proposée dans la notification (ex. « Annuler » une suppression). */
  readonly action?: { readonly label: string; readonly run: () => void };
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
  /**
   * Choix explicite de l'utilisateur pour le panneau de droite ; 
ull : le panneau suit le projet
   * (replié tant qu'aucun prédimensionnement n'existe, rien à y lire avant).
   */
  verdictPreference: 'open' | 'collapsed' | null;
  verdictTabTop: number;
  /** Palette de commandes ouverte (Ctrl K ou bouton « Rechercher une action »). */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
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
  setVerdictCollapsed: (collapsed: boolean) => void;
  setVerdictTabTop: (percent: number) => void;
}

const pickSettings = (state: UiSettings): UiSettings => ({ theme: state.theme, vibe: state.vibe, lang: state.lang, verdictPreference: state.verdictPreference });

let toastSequence = 0;
const initialSettings = readSettings();
export const useUi = create<UiStore>()((set, get) => ({
  ...initialSettings, splashSeen: false, toasts: [],
  confirm: null, verdictTabTop: 42, paletteOpen: false,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  setTheme: (theme) => { set({ theme }); saveSettings({ ...pickSettings(get()), theme }); },
  setVibe: (vibe) => { set({ vibe }); saveSettings({ ...pickSettings(get()), vibe }); },
  toggleVibe: () => { const vibe = VIBES[(VIBES.indexOf(get().vibe) + 1) % VIBES.length]; set({ vibe }); saveSettings({ ...pickSettings(get()), vibe }); },
  toggleTheme: () => { const theme = get().theme === 'dark' ? 'light' : 'dark'; set({ theme }); saveSettings({ ...pickSettings(get()), theme }); },
  setLang: (lang) => { set({ lang }); saveSettings({ ...pickSettings(get()), lang }); },
  markSplashSeen: () => set({ splashSeen: true }),
  notify: (toast) => {
    const id = ++toastSequence;
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    // Une notification qui porte une action reste le temps de la lire et d'agir.
    setTimeout(() => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })), toast.action ? 10_000 : toast.kind === 'error' ? 8000 : 4200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
  ask: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
  setVerdictCollapsed: (collapsed) => { const verdictPreference = collapsed ? 'collapsed' : 'open'; set({ verdictPreference }); saveSettings({ ...pickSettings(get()), verdictPreference }); },
  setVerdictTabTop: (percent) => set({ verdictTabTop: Math.min(88, Math.max(6, percent)) }),
}));
