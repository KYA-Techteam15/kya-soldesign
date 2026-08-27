import { create } from 'zustand';

export interface ApplicationSettings {
  companyName: string; companyAddress: string; companyPhone: string; companyEmail: string;
  reportLogo: string; reportFooter: string;
  performanceRatioPercent: number; maxLpspPercent: number; maxLolpPercent: number; inverterEfficiencyPercent: number; batteryEfficiencyPercent: number; batteryVoltage: number;
  pvSpecificCost: number; batterySpecificCost: number; inverterSpecificCost: number; pvMarginPercent: number; batteryMarginPercent: number; inverterMarginPercent: number;
  vatPercent: number; offerValidityDays: number; warrantyMonths: number; deliveryDays: number; discountPercent: number; downPaymentPercent: number; currencyCode: string;
}

const STORAGE_KEY = 'kya-sol-design.application-settings.v1';
export const defaultApplicationSettings: ApplicationSettings = {
  companyName: 'KYA-SolDesign', companyAddress: '', companyPhone: '', companyEmail: '',
  reportLogo: '', reportFooter: '',
  performanceRatioPercent: 80, maxLpspPercent: 5, maxLolpPercent: 5, inverterEfficiencyPercent: 95, batteryEfficiencyPercent: 90, batteryVoltage: 48,
  pvSpecificCost: 300000, batterySpecificCost: 150000, inverterSpecificCost: 100000, pvMarginPercent: 15, batteryMarginPercent: 15, inverterMarginPercent: 15,
  vatPercent: 0, offerValidityDays: 30, warrantyMonths: 12, deliveryDays: 0, discountPercent: 0, downPaymentPercent: 0, currencyCode: 'XOF',
};

function read(): ApplicationSettings {
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<ApplicationSettings> | null;
    return raw ? { ...defaultApplicationSettings, ...raw } : defaultApplicationSettings;
  } catch { return defaultApplicationSettings; }
}

interface SettingsStore extends ApplicationSettings { update: (values: Partial<ApplicationSettings>) => void; reset: () => void; }
export const useSettings = create<SettingsStore>()((set) => ({
  ...read(),
  update: (values) => set((current) => {
    const next = { ...current, ...values } as SettingsStore;
    const data = Object.fromEntries(Object.keys(defaultApplicationSettings).map((key) => [key, next[key as keyof ApplicationSettings]]));
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* keep session settings */ }
    return values;
  }),
  reset: () => set(() => { try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* keep defaults in memory */ } return defaultApplicationSettings; }),
}));
