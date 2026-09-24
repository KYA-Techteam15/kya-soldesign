export type SettingsCategory = 'company' | 'reports' | 'defaults' | 'projects' | 'currency' | 'sizing';

/** Familles de matériel que l'optimisation combine. */
export type EquipmentFamily = 'module' | 'battery' | 'inverter';

/**
 * « Mes références » : les références que l'utilisateur tient en stock ou pose d'habitude. L'optimisation
 * les combine ; un plafond par famille borne le nombre de combinaisons (spec 011, FR-027, FR-028).
 * Onduleurs : plafond facultatif (
ull), la liste complète des compatibles reste possible.
 */
export interface SizingSettings {
  readonly favorites: { readonly module: readonly string[]; readonly battery: readonly string[]; readonly inverter: readonly string[] };
  readonly caps: { readonly module: number; readonly battery: number; readonly inverter: number | null };
  readonly proposals: number;
}

export interface ApplicationSettingsV2 {
  readonly version: 2;
  readonly company: { readonly name: string; readonly address: string; readonly phone: string; readonly email: string };
  readonly reports: { readonly logoAssetId: string | null; readonly logoUrl: string; readonly signatureAssetId: string | null; readonly coverAssetId: string | null; readonly signatureText: string; readonly footerText: string; readonly bankDetails: string };
  readonly defaults: {
    readonly reliability: { readonly performanceRatioPercent: number; readonly maxLpspPercent: number; readonly maxLolpPercent: number };
    readonly conversion: { readonly inverterEfficiencyPercent: number; readonly batteryEfficiencyPercent: number };
    readonly equipmentCosts: { readonly currencyCode: string; readonly pvSpecificCost: number; readonly batterySpecificCost: number; readonly inverterSpecificCost: number; readonly pvMarginPercent: number; readonly batteryMarginPercent: number; readonly inverterMarginPercent: number };
    readonly commercial: { readonly vatPercent: number; readonly offerValidityDays: number; readonly warrantyMonths: number; readonly deliveryDays: number; readonly discountPercent: number; readonly downPaymentPercent: number };
  };
  readonly projects: { readonly recentProjectLimit: number; readonly autosaveStrategy: 'immediate' | 'debounced'; readonly autosaveDebounceMs: number; readonly exportDestinationMode: 'ask-each-time' | 'platform-handle' };
  readonly currency: { readonly inputCurrencyCode: string; readonly outputCurrencyCode: string; readonly rate: ExchangeRateRecord | null };
  readonly sizing: SizingSettings;
  readonly updatedAtIso: string;
}

export interface ExchangeRateRecord { readonly baseCurrencyCode: string; readonly quoteCurrencyCode: string; readonly decimalRate: string; readonly mode: 'manual' | 'remote'; readonly sourceLabel: string; readonly sourceLocator: string | null; readonly observedAtIso: string; readonly fetchedAtIso: string | null }

export const defaultApplicationSettings: ApplicationSettingsV2 = {
  version: 2,
  company: { name: 'KYA-SolDesign', address: '', phone: '', email: '' },
  reports: { logoAssetId: null, logoUrl: '', signatureAssetId: null, coverAssetId: null, signatureText: '', footerText: '', bankDetails: '' },
  defaults: {
    reliability: { performanceRatioPercent: 80, maxLpspPercent: 5, maxLolpPercent: 5 },
    conversion: { inverterEfficiencyPercent: 95, batteryEfficiencyPercent: 90 },
    equipmentCosts: { currencyCode: 'XOF', pvSpecificCost: 300000, batterySpecificCost: 150000, inverterSpecificCost: 100000, pvMarginPercent: 15, batteryMarginPercent: 15, inverterMarginPercent: 15 },
    commercial: { vatPercent: 0, offerValidityDays: 30, warrantyMonths: 12, deliveryDays: 0, discountPercent: 0, downPaymentPercent: 0 },
  },
  projects: { recentProjectLimit: 4, autosaveStrategy: 'immediate', autosaveDebounceMs: 500, exportDestinationMode: 'ask-each-time' },
  currency: { inputCurrencyCode: 'XOF', outputCurrencyCode: 'XOF', rate: null },
  sizing: { favorites: { module: [], battery: [], inverter: [] }, caps: { module: 10, battery: 10, inverter: null }, proposals: 5 },
  updatedAtIso: '',
};

export function isValidCurrencyCode(value: unknown): value is string { return typeof value === 'string' && /^[A-Z]{3}$/u.test(value); }

export function mergeSettings(base: ApplicationSettingsV2, patch: unknown): ApplicationSettingsV2 {
  if (!isRecord(patch)) return base;
  const p = patch as Partial<ApplicationSettingsV2>;
  const nested = <T extends object>(value: unknown): Partial<T> => isRecord(value) ? value as Partial<T> : {};
  return {
    ...base, ...p,
    company: { ...base.company, ...nested(p.company) }, reports: { ...base.reports, ...nested(p.reports) },
    defaults: { ...base.defaults, ...nested(p.defaults), reliability: { ...base.defaults.reliability, ...nested(p.defaults?.reliability) }, conversion: { ...base.defaults.conversion, ...nested(p.defaults?.conversion) }, equipmentCosts: { ...base.defaults.equipmentCosts, ...nested(p.defaults?.equipmentCosts) }, commercial: { ...base.defaults.commercial, ...nested(p.defaults?.commercial) } },
    projects: { ...base.projects, ...nested(p.projects) }, currency: { ...base.currency, ...nested(p.currency) },
    sizing: { ...base.sizing, ...nested(p.sizing), favorites: { ...base.sizing.favorites, ...nested(p.sizing?.favorites) }, caps: { ...base.sizing.caps, ...nested(p.sizing?.caps) } },
  };
}

export function validateApplicationSettings(value: unknown): ApplicationSettingsV2 {
  if (!isRecord(value) || value.version !== 2) throw new Error('SETTINGS_UNSUPPORTED_VERSION');
  const merged = mergeSettings(defaultApplicationSettings, value);
  range(merged.defaults.reliability.performanceRatioPercent, 0, 100, 'performanceRatioPercent'); range(merged.defaults.reliability.maxLpspPercent, 0, 100, 'maxLpspPercent'); range(merged.defaults.reliability.maxLolpPercent, 0, 100, 'maxLolpPercent');
  range(merged.defaults.conversion.inverterEfficiencyPercent, 0, 100, 'inverterEfficiencyPercent'); range(merged.defaults.conversion.batteryEfficiencyPercent, 0, 100, 'batteryEfficiencyPercent');
  range(merged.defaults.equipmentCosts.pvSpecificCost, 0, Number.MAX_SAFE_INTEGER, 'pvSpecificCost'); range(merged.defaults.equipmentCosts.batterySpecificCost, 0, Number.MAX_SAFE_INTEGER, 'batterySpecificCost'); range(merged.defaults.equipmentCosts.inverterSpecificCost, 0, Number.MAX_SAFE_INTEGER, 'inverterSpecificCost'); range(merged.defaults.equipmentCosts.pvMarginPercent, 0, 1000, 'pvMarginPercent'); range(merged.defaults.equipmentCosts.batteryMarginPercent, 0, 1000, 'batteryMarginPercent'); range(merged.defaults.equipmentCosts.inverterMarginPercent, 0, 1000, 'inverterMarginPercent');
  range(merged.defaults.commercial.vatPercent, 0, 100, 'vatPercent'); integer(merged.defaults.commercial.offerValidityDays, 0, 3650, 'offerValidityDays'); integer(merged.defaults.commercial.warrantyMonths, 0, 240, 'warrantyMonths'); integer(merged.defaults.commercial.deliveryDays, 0, 3650, 'deliveryDays'); range(merged.defaults.commercial.discountPercent, 0, 100, 'discountPercent'); range(merged.defaults.commercial.downPaymentPercent, 0, 100, 'downPaymentPercent'); integer(merged.projects.recentProjectLimit, 1, 12, 'recentProjectLimit'); integer(merged.projects.autosaveDebounceMs, 0, 60000, 'autosaveDebounceMs');
  if (!isValidCurrencyCode(merged.defaults.equipmentCosts.currencyCode) || !isValidCurrencyCode(merged.currency.inputCurrencyCode) || !isValidCurrencyCode(merged.currency.outputCurrencyCode)) throw new Error('SETTINGS_INVALID_CURRENCY');
  if (merged.currency.rate !== null) validateRate(merged.currency.rate);
  integer(merged.sizing.caps.module, 1, 50, 'capModule'); integer(merged.sizing.caps.battery, 1, 50, 'capBattery'); if (merged.sizing.caps.inverter !== null) integer(merged.sizing.caps.inverter, 1, 200, 'capInverter'); integer(merged.sizing.proposals, 1, 10, 'proposals');
  for (const family of ['module', 'battery', 'inverter'] as const) if (!Array.isArray(merged.sizing.favorites[family]) || merged.sizing.favorites[family].some((id) => typeof id !== 'string')) throw new Error('SETTINGS_INVALID_favorites');
  return merged;
}

export function migrateApplicationSettings(raw: unknown): { readonly settings: ApplicationSettingsV2; readonly ignoredKeys: readonly string[] } {
  if (isRecord(raw) && raw.version === 2) return { settings: validateApplicationSettings(raw), ignoredKeys: [] };
  if (!isRecord(raw)) throw new Error('SETTINGS_INVALID_JSON');
  const n = (key: string, fallback: number) => typeof raw[key] === 'number' && Number.isFinite(raw[key]) ? raw[key] as number : fallback;
  const s: ApplicationSettingsV2 = { ...defaultApplicationSettings, company: { name: typeof raw.companyName === 'string' ? raw.companyName : 'KYA-SolDesign', address: typeof raw.companyAddress === 'string' ? raw.companyAddress : '', phone: typeof raw.companyPhone === 'string' ? raw.companyPhone : '', email: typeof raw.companyEmail === 'string' ? raw.companyEmail : '' }, reports: { logoAssetId: null, logoUrl: typeof raw.reportLogo === 'string' ? raw.reportLogo : '', signatureAssetId: null, coverAssetId: null, signatureText: '', footerText: typeof raw.reportFooter === 'string' ? raw.reportFooter : '', bankDetails: '' }, defaults: { reliability: { performanceRatioPercent: n('performanceRatioPercent', 80), maxLpspPercent: n('maxLpspPercent', 5), maxLolpPercent: n('maxLolpPercent', 5) }, conversion: { inverterEfficiencyPercent: n('inverterEfficiencyPercent', 95), batteryEfficiencyPercent: n('batteryEfficiencyPercent', 90) }, equipmentCosts: { currencyCode: typeof raw.currencyCode === 'string' ? raw.currencyCode : 'XOF', pvSpecificCost: n('pvSpecificCost', 300000), batterySpecificCost: n('batterySpecificCost', 150000), inverterSpecificCost: n('inverterSpecificCost', 100000), pvMarginPercent: n('pvMarginPercent', 15), batteryMarginPercent: n('batteryMarginPercent', 15), inverterMarginPercent: n('inverterMarginPercent', 15) }, commercial: { vatPercent: n('vatPercent', 0), offerValidityDays: n('offerValidityDays', 30), warrantyMonths: n('warrantyMonths', 12), deliveryDays: n('deliveryDays', 0), discountPercent: n('discountPercent', 0), downPaymentPercent: n('downPaymentPercent', 0) } }, updatedAtIso: '' };
  return { settings: validateApplicationSettings(s), ignoredKeys: Object.keys(raw).filter((key) => key === 'batteryDodPercent' || key === 'batteryDod' || key === 'batteryVoltage' || key === 'batteryNominalVoltageV') };
}

export function validateRate(rate: ExchangeRateRecord): ExchangeRateRecord { if (!isValidCurrencyCode(rate.baseCurrencyCode) || !isValidCurrencyCode(rate.quoteCurrencyCode) || !/^\d+(?:\.\d+)?$/u.test(rate.decimalRate) || Number(rate.decimalRate) <= 0) throw new Error('SETTINGS_INVALID_RATE'); return rate; }
function isRecord(value: unknown): value is Record<string, any> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function range(value: number, min: number, max: number, key: string): void { if (!Number.isFinite(value) || value < min || value > max) throw new Error('SETTINGS_INVALID_' + key); }
function integer(value: number, min: number, max: number, key: string): void { if (!Number.isInteger(value)) throw new Error('SETTINGS_INVALID_' + key); range(value, min, max, key); }
