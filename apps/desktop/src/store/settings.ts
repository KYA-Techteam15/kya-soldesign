import { create } from 'zustand';
import { defaultApplicationSettings, migrateApplicationSettings, validateApplicationSettings, type ApplicationSettingsV2, type SettingsCategory } from '../app/models/applicationSettings.js';

const STORAGE_KEY_V1 = 'kya-sol-design.application-settings.v1';
const STORAGE_KEY_V2 = 'kya-sol-design.application-settings.v2';
const RECOVERY_KEY = 'kya-sol-design.application-settings.v1.backup';

interface SettingsStore extends ApplicationSettingsV2 {
  readonly storageError: string | null;
  readonly migrationIgnoredKeys: readonly string[];
  readonly updateCategory: <K extends SettingsCategory>(category: K, patch: Partial<ApplicationSettingsV2[K]>) => void;
  readonly replace: (settings: unknown) => void;
  readonly resetCategory: (category: SettingsCategory) => void;
  readonly reset: () => void;
  readonly exportJson: () => string;
}

function initialState(): Pick<SettingsStore, keyof ApplicationSettingsV2 | 'storageError' | 'migrationIgnoredKeys'> {
  if (typeof window === 'undefined') return { ...defaultApplicationSettings, storageError: null, migrationIgnoredKeys: [] };
  try {
    const v2 = window.localStorage.getItem(STORAGE_KEY_V2);
    if (v2 !== null) return { ...validateApplicationSettings(JSON.parse(v2)), storageError: null, migrationIgnoredKeys: [] };
    const v1 = window.localStorage.getItem(STORAGE_KEY_V1);
    if (v1 === null) return { ...defaultApplicationSettings, storageError: null, migrationIgnoredKeys: [] };
    const migrated = migrateApplicationSettings(JSON.parse(v1));
    window.localStorage.setItem(RECOVERY_KEY, v1); window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated.settings));
    return { ...migrated.settings, storageError: null, migrationIgnoredKeys: migrated.ignoredKeys };
  } catch (error) { return { ...defaultApplicationSettings, storageError: error instanceof Error ? error.message : 'SETTINGS_READ_FAILED', migrationIgnoredKeys: [] }; }
}

function persist(settings: ApplicationSettingsV2): string | null { if (typeof window === 'undefined') return null; try { window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(settings)); return null; } catch (error) { return error instanceof Error ? error.message : 'SETTINGS_WRITE_FAILED'; } }

const initial = initialState();
export const useSettings = create<SettingsStore>()((set, get) => ({
  ...initial,
  updateCategory: (category, patch) => set((current) => { const next = validateApplicationSettings({ ...current, [category]: mergeCategory(current[category], patch), updatedAtIso: new Date().toISOString() }); return { ...next, storageError: persist(next), migrationIgnoredKeys: current.migrationIgnoredKeys }; }),
  replace: (candidate) => set((current) => { const next = validateApplicationSettings(candidate); return { ...next, storageError: persist(next), migrationIgnoredKeys: current.migrationIgnoredKeys }; }),
  resetCategory: (category) => set((current) => { const next = validateApplicationSettings({ ...current, [category]: defaultApplicationSettings[category], updatedAtIso: new Date().toISOString() }); return { ...next, storageError: persist(next), migrationIgnoredKeys: current.migrationIgnoredKeys }; }),
  reset: () => set(() => { try { if (typeof window !== 'undefined') { window.localStorage.removeItem(STORAGE_KEY_V2); window.localStorage.removeItem(STORAGE_KEY_V1); } } catch { /* memory reset remains usable */ } return { ...defaultApplicationSettings, storageError: null, migrationIgnoredKeys: [] }; }),
  exportJson: () => JSON.stringify({ schema: 'kya-sol-design.settings', version: 2, settings: get() }, null, 2),
}));

function mergeCategory<T>(base: T, patch: Partial<T>): T { if (typeof base === 'object' && base !== null && typeof patch === 'object' && patch !== null) return { ...base, ...patch } as T; return patch as T; }
export type { ApplicationSettingsV2 } from '../app/models/applicationSettings.js';
export { defaultApplicationSettings } from '../app/models/applicationSettings.js';
