export type SystemType =
  | 'standalone_all_in_one'
  | 'standalone_inverter_controller'
  | 'grid_tied'
  | 'pv_diesel'
  | 'solar_street_light'
  | 'solar_water_pumping'
  | 'undefined';
export type ApplicationType = 'residential' | 'commercial' | 'industrial' | 'agricultural';
export type LoadSource = 'equipments' | 'hourly' | 'meter';
export type Granularity = 'annual' | 'weekly' | 'daily' | 'monthly' | 'periodic' | 'combined';
export type CableSegment = 'pv_inverter' | 'inverter_battery' | 'inverter_load';

export interface NamedProfile {
  id: string;
  name: string;
  color: string;
  source: LoadSource;
  classic: { id: string; name: string; qty: number; unitPower: number; yield: number | null; simultaneity: number | null; operatingFractions: number[]; opHours: number }[];
  inductive: { id: string; name: string; qty: number; unitPower: number; yield: number | null; simultaneity: number | null; operatingFractions: number[]; opHours: number; startupCoef: number | null }[];
  hourly: { hour: number; realPower: number; peakPower: number }[];
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
  details: { clientName: string; clientAddress: string; clientTel: string; clientEmail: string; followerName: string; applicationType: ApplicationType; projectDate: string; projectNumber: string; projectLocation: string; projectImage: string };
  site: { country: string; countryCode: string; localityId: string | null; region: string; latitude: number; longitude: number; tilt: number; azimuth: number; irradiation: number; monthlyIrradiation: (number | null)[]; weatherSourceId: string | null; timezoneIana: string | null; designMonth: number | null; irradiationBasis: { tilt: number; azimuth: number } | null; downloadedSource: { name: string; provider: string; versionOrDate: string; locator: string; retrievedAtIso: string; qualityFlags: string[]; weatherFileId?: string; sourceSha256?: string; timezoneOffsetMinutes?: number; albedo?: number; hourlyIrradiance?: { timestampUtcIso: string; ghiWm2: number; dniWm2: number; dhiWm2: number }[] } | null };
  load: { granularity: Granularity; profiles: NamedProfile[]; activeProfileId: string; irMin: number };
  assumptions: { lpspMax: number; lolpMax: number; systemPr: number; inverterYield: number; batteryYield: number; batteryVoltage: number; batteryDod: number; pvSpecificCost: number; pvMargin: number; batterySpecificCost: number; batteryMargin: number; inverterSpecificCost: number; inverterMargin: number; projectLifetime: number; pvLifetime: number; batteryLifetime: number; inverterLifetime: number; pvMaintenance: number; batteryMaintenance: number; inverterMaintenance: number; actualizationRate: number; lcoeGrid: number; emissionFactor: number; autoConsumptionRate: number; dieselSpecificCost: number };
  selection: { moduleId: string | null; batteryId: string | null; inverterId: string | null };
  cables: { segment: CableSegment; length: number; material: 'copper' | 'aluminium'; installation: 'buried' | 'not_buried' }[];
  protections: { segment: CableSegment; caliberA: number | null }[];
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
