import type { ProjectIssueV1 } from '@ksd/project-format';

export type SystemType =
  | 'standalone_all_in_one'
  | 'standalone_inverter_controller'
  | 'grid_tied'
  | 'pv_diesel'
  | 'solar_street_light'
  | 'solar_water_pumping'
  | 'undefined';
export type ApplicationType = 'residential' | 'commercial' | 'industrial' | 'agricultural';
/** Source de consommation d'un profil ; l'année composée se choisit au niveau de la charge (`activeMode`). */
export type LoadSource = 'equipments' | 'hourly' | 'annual' | 'meter';
export type Granularity = 'annual' | 'weekly' | 'daily' | 'monthly' | 'periodic' | 'combined' | 'workweek-weekend' | 'periods' | 'periods-by-day-type';
export type CableSegment = 'pv_inverter' | 'inverter_battery' | 'inverter_load';

export interface LoadCalendarView {
  version: 2;
  mode: 'annual' | 'workweek-weekend' | 'periods' | 'periods-by-day-type';
  dayGroups: { id: string; kind: 'all-days' | 'workweek' | 'weekend'; weekdaysIso: number[] }[];
  periods: { id: string; name: string; startMonthDay: string; endMonthDay: string; displayColor?: string }[];
  assignments: { periodId: string; dayGroupId: string; profileId: string }[];
}

export interface DirectLoadProfileView {
  id: string;
  name: string;
  color: string;
  hourly: { hour: number; realPower: number; peakPower: number }[];
}

export interface LoadCompositionView {
  organization: 'workweek-weekend' | 'periods' | 'periods-by-day-type';
  calendar: LoadCalendarView;
  profiles: DirectLoadProfileView[];
}

/**
 * Un appareil recensé. Coefficient de démarrage 1 : charge classique ; différent de 1 : inductive.
 * `inductive` peut aussi être coché à la main : avec un coefficient de 1, il reste « à préciser ».
 */
export interface ApplianceView {
  id: string;
  name: string;
  qty: number;
  unitPower: number;
  yield: number | null;
  operatingFractions: number[];
  opHours: number;
  startupCoef: number;
  inductive: boolean;
}

export interface NamedProfile {
  id: string;
  name: string;
  color: string;
  source: LoadSource;
  appliances: ApplianceView[];
  /** Journée type, kW ; une pointe `null` vaut la moyenne (« = »). */
  hourly: { hour: number; realPower: number; peakPower: number | null }[];
  /** Année importée (8 760 heures, kW), conservée même quand une autre source est active. */
  annual: { hour: number; realPower: number; peakPower: number | null }[] | null;
  annualSourceName: string | null;
  meter: { observedEnergy: number; observedDays: number | null; normalizedProfileId: string | null; forceYEn: boolean; targetYEn: number | null; meterAmperage: number; networkType: 'single_phase' | 'three_phase'; morningPeakStart: string; morningPeakEnd: string; eveningPeakStart: string; eveningPeakEnd: string; peakImportance: number; targetQualityFactor: number } | null;
}

export interface ProjectViewModel {
  id: string;
  name: string;
  systemType: SystemType;
  createdAt: string;
  updatedAt: string;
  lastCalculation: ProjectCalculation | null;
  sizingCalculation: ProjectCalculation | null;
  currency: string;
  details: { clientName: string; clientAddress: string; clientTel: string; clientEmail: string; followerName: string; applicationType: ApplicationType; projectDate: string; projectNumber: string; projectLocation: string; projectImage: string; documentLogo: string };
  site: { country: string; countryCode: string; localityId: string | null; region: string; latitude: number; longitude: number; tilt: number; azimuth: number; irradiation: number; monthlyIrradiation: (number | null)[]; weatherSourceId: string | null; timezoneIana: string | null; designMonth: number | null; designColdTemperatureC: number | null; irradiationBasis: { tilt: number; azimuth: number } | null; downloadedSource: { name: string; provider: string; versionOrDate: string; locator: string; retrievedAtIso: string; qualityFlags: string[]; weatherFileId?: string; sourceSha256?: string; timezoneOffsetMinutes?: number; albedo?: number; ambientTemperatureMinC?: number; ambientTemperatureMaxC?: number; hourlyIrradiance?: { timestampUtcIso: string; ghiWm2: number; dniWm2: number; dhiWm2: number }[] } | null };
  load: {
    granularity: Granularity; activeMode: 'simple' | 'composed'; composition: LoadCompositionView | null; calendar: LoadCalendarView; profiles: NamedProfile[]; activeProfileId: string; irMin: number;
    /** Appareils dont la simultanéité (supprimée) valait moins de 1 : avis affiché jusqu'à sa fermeture. */
    simultaneityNotice: string[] | null;
  };
  assumptions: { lpspMax: number; lolpMax: number; systemPr: number; inverterYield: number; batteryYield: number; batteryVoltage: number; batteryDod: number; pvSpecificCost: number; pvMargin: number; pvCostInputMode: 'specific' | 'component'; pvReferencePowerW: number | null; pvReferencePrice: number | null; batterySpecificCost: number; batteryMargin: number; storageCostInputMode: 'specific' | 'component'; storageReferencePrice: number | null; storageReferenceKwh: number | null; inverterSpecificCost: number; inverterMargin: number; inverterCostInputMode: 'specific' | 'component'; inverterReferencePowerW: number | null; inverterReferencePrice: number | null; projectLifetime: number; pvLifetime: number; batteryLifetime: number; inverterLifetime: number; pvMaintenance: number; batteryMaintenance: number; inverterMaintenance: number; actualizationRate: number; lcoeGrid: number; emissionFactor: number; autoConsumptionRate: number; dieselSpecificCost: number };
  selection: { moduleId: string | null; batteryId: string | null; inverterId: string | null };
  cables: { segment: CableSegment; length: number; material: 'copper' | 'aluminium'; installation: 'buried' | 'not_buried'; maxVoltageDropPercent: number }[];
  protections: { segment: CableSegment; caliberA: number | null; type: 'Fusible gPV' | 'Fusible gG' | 'Disjoncteur DC' | 'Disjoncteur AC' | null }[];
  /** Versions émises et verrou ; un projet jamais émis n'a aucune version. */
  issue: ProjectIssueV1;
  costing: { useGlobalCost: boolean; moduleUnitPrice: number; moduleMargin: number; batteryUnitPrice: number; batteryMargin: number; inverterUnitPrice: number; inverterMargin: number; definedCostForAccessories: boolean; cablingPrice: number; cablingMargin: number; electricalBoxPrice: number; electricalBoxMargin: number; supportsPrice: number; supportsMargin: number; transportPrice: number; transportMargin: number; installationPrice: number; installationMargin: number; tvaPercent: number; reductionPercent: number; downPaymentPercent: number; deliveryTime: number; offerValidity: number; productWarranty: number; additional: { id: string; name: string; description: string; quantity: number; costPrice: number; marginPercent: number }[] };
}

export interface ProjectCalculation {
  readonly engineVersion: string;
  readonly inputHash: string;
  readonly output: unknown;
  readonly issues: readonly { readonly code: string; readonly severity: 'warning' | 'error' | 'info'; readonly message: string; readonly sourceId?: string }[];
  readonly warnings?: readonly unknown[];
  readonly trace: readonly unknown[];
}
