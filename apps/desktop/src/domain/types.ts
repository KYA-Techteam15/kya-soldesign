/**
 * Types de domaine — miroir des dataclasses de `ksd_app/core/state/models/`.
 * Aucune vue ne définit ses propres formes : tout part d'ici.
 */

// ---------------------------------------------------------------- Référentiel

export interface ModuleRef {
  id: string;
  code: string;
  maker: string;
  power: number; // Wc
  module_type: string;
  vmp: number; // V
  voc_stc: number; // V
  imp_stc: number; // A
  isc_stc: number; // A
  coef_temp_pmp: number | null;
  coef_temp_voc: number | null;
  tnoct: number | null;
  area: number; // m²
}

export interface BatteryRef {
  id: string;
  code: string;
  maker: string;
  technology: string;
  capacity: number; // Ah
  voltage: number; // V
  max_dod: number; // %
  round_trip_efficiency: number; // %
  cycle_life: number | null;
}

export interface InverterRef {
  id: string;
  code: string;
  maker: string;
  inverter_type: string;
  nominal_power: number; // W
  overload_power: number | null; // W
  nominal_dc_voltage: number; // V
  efficiency: number; // %
  can_be_in_parallel: boolean | null;
  max_parallel_units: number | null;
  pv_array_max_power: number | null; // W
  mppt_min_voltage: number | null; // V
  mppt_max_voltage: number | null; // V
  pv_open_circuit_max_voltage: number | null; // V
  pv_inputs_number: number | null;
  max_charging_current: number | null; // A
  nominal_ac_voltage: number | null; // V
}

export interface LocalityRef {
  id: string;
  name: string;
  country_code: string;
  latitude: number;
  longitude: number;
}

export interface CountryRef {
  code: number;
  alpha2: string;
  alpha3: string;
  nom_en_gb: string;
  nom_fr_fr: string;
}

export interface WeatherSourceRef {
  id: string;
  locality_id: string;
  source_name: string;
  provider: string;
  default_tilt: number | null;
  default_azimuth: number | null;
}

// ---------------------------------------------------------------- Projet

export type SystemType =
  | 'standalone_all_in_one'
  | 'standalone_inverter_controller'
  | 'grid_tied'
  | 'pv_diesel'
  | 'solar_street_light'
  | 'solar_water_pumping'
  | 'undefined';

export type ApplicationType =
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'agricultural';

export interface ProjectDetails {
  clientName: string;
  clientAddress: string;
  clientTel: string;
  clientEmail: string;
  followerName: string;
  applicationType: ApplicationType;
  projectDate: string; // ISO
  projectNumber: string;
  projectLocation: string;
  projectImage: string;
}

export interface SiteInfo {
  country: string;
  countryCode: string;
  localityId: string | null;
  region: string;
  latitude: number;
  longitude: number;
  tilt: number; // °
  azimuth: number; // °
  irradiation: number; // kWh/m²/j — moyenne
  monthlyIrradiation: number[]; // 12 valeurs
  weatherSourceId: string | null;
  /**
   * Orientation sous laquelle l'irradiation affichée a été calculée. Le
   * profil est en plan des modules : changer l'inclinaison le périme. Le
   * moteur Python traduit ce cas par un profil vide ; ici on garde la
   * dernière valeur et on la signale comme à recalculer.
   */
  irradiationBasis: { tilt: number; azimuth: number } | null;
  /**
   * Série téléchargée depuis ce dossier, quand elle ne vient pas du
   * référentiel embarqué : `save_weather_source` crée au besoin la localité,
   * donc une source peut exister sans figurer dans les seize d'origine.
   */
  downloadedSource: { name: string; provider: string } | null;
}

// ---------------------------------------------------------------- Charges

/** `source_type` du modèle Python : 0 = appareils, 1 = horaire, 2 = compteur. */
export type LoadSource = 'equipments' | 'hourly' | 'meter';

export interface ClassicEquipment {
  id: string;
  name: string;
  qty: number;
  unitPower: number; // W
  yield: number; // 0–1
  opHours: number; // h/j
}

export interface InductiveEquipment extends ClassicEquipment {
  startupCoef: number;
}

export interface HourlyPoint {
  hour: number; // 0–23
  realPower: number; // kW
  peakPower: number; // kW
}

export interface MeterEstimation {
  monthlyEnergy: number; // kWh
  meterAmperage: number; // A
  networkType: 'single_phase' | 'three_phase';
  morningPeakStart: string;
  morningPeakEnd: string;
  eveningPeakStart: string;
  eveningPeakEnd: string;
  peakImportance: number; // 0–1
  targetQualityFactor: number;
}

export type Granularity =
  | 'annual'
  | 'weekly'
  | 'daily'
  | 'monthly'
  | 'periodic'
  | 'combined';

export interface NamedProfile {
  id: string;
  name: string;
  color: string;
  source: LoadSource;
  classic: ClassicEquipment[];
  inductive: InductiveEquipment[];
  hourly: HourlyPoint[];
  meter: MeterEstimation | null;
}

export interface LoadState {
  granularity: Granularity;
  profiles: NamedProfile[];
  activeProfileId: string;
  irMin: number; // W/m²
}

// ---------------------------------------------------------------- Hypothèses

export interface Assumptions {
  lpspMax: number; // %
  lolpMax: number; // %
  systemPr: number; // %
  inverterYield: number; // %
  batteryYield: number; // %
  batteryVoltage: number; // V
  batteryDod: number; // %

  pvSpecificCost: number; // /kWc
  pvMargin: number; // %
  batterySpecificCost: number; // /kWh
  batteryMargin: number; // %
  inverterSpecificCost: number; // /kW
  inverterMargin: number; // %

  projectLifetime: number; // ans
  pvLifetime: number;
  batteryLifetime: number;
  inverterLifetime: number;

  pvMaintenance: number; // %/an
  batteryMaintenance: number;
  inverterMaintenance: number;
  actualizationRate: number; // %

  lcoeGrid: number; // T_grid, devise/kWh
  emissionFactor: number; // kgCO2/kWh
  autoConsumptionRate: number; // %
  /** `ci_dg` — coût d'investissement d'un groupe électrogène, par kW installé.
      Le réglage a été retiré de l'interface Python (TR-07) mais l'indicateur
      « équivalent GE » reste calculé sur cette référence. */
  dieselSpecificCost: number; // devise/kW
}

// ---------------------------------------------------------------- Matériel

export interface EquipmentSelection {
  moduleId: string | null;
  batteryId: string | null;
  inverterId: string | null;
}

// ---------------------------------------------------------------- Câbles

export type CableSegment = 'pv_inverter' | 'inverter_battery' | 'inverter_load';

export interface CableChoice {
  segment: CableSegment;
  length: number; // m
  material: 'copper' | 'aluminium';
  installation: 'buried' | 'not_buried';
}

/**
 * Calibre retenu par segment, quand l'utilisateur écarte la recommandation.
 *
 * Le calibre n'est pas un résultat : `ksd_app` le choisit parmi les valeurs
 * normalisées disponibles, puis dimensionne le câble avec (`'current': caliber`
 * dans `page_04/view_model.py`). C'est donc une saisie, avec une valeur
 * conseillée par défaut.
 */
export interface ProtectionChoice {
  segment: CableSegment;
  caliberA: number | null;
}

// ---------------------------------------------------------------- Chiffrage

export interface AdditionalEquipment {
  id: string;
  name: string;
  description: string;
  quantity: number;
  costPrice: number;
  marginPercent: number;
}

export interface CostingInputs {
  useGlobalCost: boolean;
  moduleUnitPrice: number;
  moduleMargin: number;
  batteryUnitPrice: number;
  batteryMargin: number;
  inverterUnitPrice: number;
  inverterMargin: number;

  /** Postes annexes : valeur absolue si `definedCost`, sinon % du matériel principal. */
  definedCostForAccessories: boolean;
  cablingPrice: number;
  cablingMargin: number;
  electricalBoxPrice: number;
  electricalBoxMargin: number;
  supportsPrice: number;
  supportsMargin: number;
  transportPrice: number;
  transportMargin: number;
  installationPrice: number;
  installationMargin: number;

  tvaPercent: number;
  reductionPercent: number;
  downPaymentPercent: number;
  deliveryTime: number; // jours
  offerValidity: number; // jours
  productWarranty: number; // mois

  additional: AdditionalEquipment[];
}

// ---------------------------------------------------------------- État projet

export interface Project {
  id: string;
  name: string;
  systemType: SystemType;
  createdAt: string;
  updatedAt: string;
  details: ProjectDetails;
  site: SiteInfo;
  load: LoadState;
  assumptions: Assumptions;
  selection: EquipmentSelection;
  cables: CableChoice[];
  protections: ProtectionChoice[];
  costing: CostingInputs;
  currency: string;
}
