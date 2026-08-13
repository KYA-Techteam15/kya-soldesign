import type { Equipment } from '@ksd/catalog';
import type { Locality, WeatherSource } from '@ksd/domain';
import type {
  BatteryRef,
  InverterRef,
  LocalityRef,
  ModuleRef,
  WeatherSourceRef,
} from '../../domain/types.js';

type PvModule = Extract<Equipment, { readonly kind: 'pv-module' }>;
type Battery = Extract<Equipment, { readonly kind: 'battery' }>;
type Inverter = Extract<Equipment, { readonly kind: 'inverter' }>;

function requiredNumber(value: number | null, field: string): number {
  if (value === null) throw new Error(`CATALOG_REQUIRED_FIELD_UNKNOWN:${field}`);
  return value;
}

export const moduleToView = (module: PvModule): ModuleRef => ({
  id: module.id,
  code: module.model,
  maker: module.manufacturer,
  power: module.nominalPowerW,
  module_type: module.technology ?? '—',
  vmp: module.voltageAtMaximumPowerV,
  voc_stc: module.openCircuitVoltageV,
  imp_stc: module.currentAtMaximumPowerA,
  isc_stc: module.shortCircuitCurrentA,
  coef_temp_pmp: module.temperatureCoefficientPmaxPerC,
  coef_temp_voc: module.temperatureCoefficientVocPerC,
  tnoct: module.nominalOperatingCellTemperatureC,
  area: requiredNumber(module.areaM2, 'areaM2'),
});

export const batteryToView = (battery: Battery): BatteryRef => ({
  id: battery.id,
  code: battery.model,
  maker: battery.manufacturer,
  technology: battery.technology ?? '—',
  capacity: battery.nominalCapacityAh,
  voltage: battery.nominalVoltageV,
  max_dod: requiredNumber(battery.usableDepthOfDischargeRatio, 'usableDepthOfDischargeRatio') * 100,
  round_trip_efficiency: requiredNumber(battery.roundTripEfficiencyRatio, 'roundTripEfficiencyRatio') * 100,
  cycle_life: battery.cycleLife,
});

export const inverterToView = (inverter: Inverter): InverterRef => ({
  id: inverter.id,
  code: inverter.model,
  maker: inverter.manufacturer,
  inverter_type: inverter.inverterType ?? '—',
  nominal_power: inverter.nominalAcPowerW,
  overload_power: inverter.surgePowerW,
  nominal_dc_voltage: inverter.nominalDcVoltageV,
  efficiency: requiredNumber(inverter.efficiencyRatio, 'efficiencyRatio') * 100,
  can_be_in_parallel: inverter.canBeInParallel,
  max_parallel_units: inverter.maxParallelUnits,
  pv_array_max_power: inverter.pvArrayMaxPowerW,
  mppt_min_voltage: inverter.mpptMinVoltageV,
  mppt_max_voltage: inverter.mpptMaxVoltageV,
  pv_open_circuit_max_voltage: inverter.pvOpenCircuitMaxVoltageV,
  pv_inputs_number: inverter.pvInputsNumber,
  max_charging_current: inverter.maxChargingCurrentA,
  nominal_ac_voltage: inverter.nominalAcVoltageV,
});

export const localityToView = (locality: Locality): LocalityRef => ({
  id: locality.id,
  name: locality.name,
  country_code: locality.countryCode,
  latitude: locality.latitudeDeg,
  longitude: locality.longitudeDeg,
});

export const weatherSourceToView = (source: WeatherSource): WeatherSourceRef => ({
  id: source.id,
  locality_id: source.localityId,
  source_name: source.sourceName,
  provider: source.provider,
  default_tilt: source.defaultTiltDeg,
  default_azimuth: source.defaultAzimuthDeg,
});

export function equipmentViews(equipment: readonly Equipment[]) {
  return {
    modules: equipment.filter((item): item is PvModule => item.kind === 'pv-module').map(moduleToView),
    batteries: equipment.filter((item): item is Battery => item.kind === 'battery').map(batteryToView),
    inverters: equipment.filter((item): item is Inverter => item.kind === 'inverter').map(inverterToView),
  };
}

export function countryName(alpha2: string, lang: 'fr' | 'en'): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(alpha2) ?? alpha2;
  } catch {
    return alpha2;
  }
}
