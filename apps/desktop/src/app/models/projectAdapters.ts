import type { SystemKind } from '@ksd/domain';
import { parseProjectFile, type ProjectFileV1 } from '@ksd/project-format';
import { parseProjectInputsV1, type ProjectInputsV1 } from './projectInputs.js';
import type { ProjectViewModel, SystemType } from './projectView.js';

const systemToCanonical: Readonly<Record<Exclude<SystemType, 'undefined'>, SystemKind>> = {
  standalone_all_in_one: 'standalone-all-in-one',
  standalone_inverter_controller: 'standalone-controller-inverter',
  grid_tied: 'grid-tied',
  pv_diesel: 'pv-diesel',
  solar_street_light: 'solar-street-lighting',
  solar_water_pumping: 'solar-pumping',
};

const systemToView: Readonly<Record<SystemKind, Exclude<SystemType, 'undefined'>>> = {
  'standalone-all-in-one': 'standalone_all_in_one',
  'standalone-controller-inverter': 'standalone_inverter_controller',
  'grid-tied': 'grid_tied',
  'pv-diesel': 'pv_diesel',
  'solar-street-lighting': 'solar_street_light',
  'solar-pumping': 'solar_water_pumping',
};

const ratio = (percent: number): number => percent / 100;
const percent = (value: number | null): number => value === null ? 0 : value * 100;
const valueOrZero = (value: number | null): number => value ?? 0;

function absoluteOrRatio(value: number, absolute: boolean) {
  return absolute
    ? { mode: 'absolute' as const, amountMinor: Math.max(0, Math.round(value)) }
    : { mode: 'ratio' as const, ratio: ratio(value) };
}

function costValue(value: { readonly mode: 'absolute'; readonly amountMinor: number }
  | { readonly mode: 'ratio'; readonly ratio: number }): number {
  return value.mode === 'absolute' ? value.amountMinor : percent(value.ratio);
}

export function systemTypeToCanonical(system: SystemType): SystemKind {
  if (system === 'undefined') throw new Error('PROJECT_SYSTEM_UNDEFINED');
  return systemToCanonical[system];
}

export function createEmptyProjectInputs(): ProjectInputsV1 {
  return parseProjectInputsV1({
    schemaVersion: 1,
    details: {
      clientName: '', clientAddress: '', clientPhone: '', clientEmail: '',
      projectOfficerName: '', applicationType: 'residential', projectDate: null,
      projectNumber: '', projectLocationLabel: '', projectImageRef: null,
    },
    site: {
      countryCode: null, localityId: null, regionLabel: '', latitudeDeg: null,
      longitudeDeg: null, arrayTiltDeg: null, arrayAzimuthDeg: null,
      weatherSourceId: null,
    },
    load: {
      granularity: 'annual', activeProfileId: 'profile-1',
      minimumOperatingIrradianceWPerM2: null,
      profiles: [{
        id: 'profile-1', name: 'Profil annuel', displayColor: '#F99D32',
        source: 'equipment', items: [],
        hourlyPoints: Array.from({ length: 24 }, (_, hourIndex) => ({
          hourIndex, activePowerW: 0, peakPowerW: null,
        })),
        meter: null,
      }],
    },
    assumptions: {
      maxLpspRatio: null, maxLolpRatio: null, systemPerformanceRatio: null,
      inverterEfficiencyRatio: null, batteryEfficiencyRatio: null,
      batteryNominalVoltageV: null, batteryDodRatio: null,
      pvSpecificCostMinorPerKw: null, pvMarginRatio: null,
      batterySpecificCostMinorPerKwh: null, batteryMarginRatio: null,
      inverterSpecificCostMinorPerKw: null, inverterMarginRatio: null,
      projectLifetimeYears: null, pvLifetimeYears: null, batteryLifetimeYears: null,
      inverterLifetimeYears: null, pvMaintenanceRatioPerYear: null,
      batteryMaintenanceRatioPerYear: null, inverterMaintenanceRatioPerYear: null,
      discountRateRatio: null, gridTariffMinorPerKwh: null,
      gridEmissionKgCo2PerKwh: null, selfConsumptionRatio: null,
      dieselSpecificCostMinorPerKw: null,
    },
    cableChoices: [], protectionChoices: [],
    costing: {
      useGlobalCost: false,
      moduleUnitPriceMinor: 0, moduleMarginRatio: 0,
      batteryUnitPriceMinor: 0, batteryMarginRatio: 0,
      inverterUnitPriceMinor: 0, inverterMarginRatio: 0,
      cabling: { mode: 'absolute', amountMinor: 0 },
      electricalBox: { mode: 'absolute', amountMinor: 0 },
      supports: { mode: 'absolute', amountMinor: 0 },
      transport: { mode: 'absolute', amountMinor: 0 },
      installation: { mode: 'absolute', amountMinor: 0 },
      cablingMarginRatio: 0, electricalBoxMarginRatio: 0, supportsMarginRatio: 0,
      transportMarginRatio: 0, installationMarginRatio: 0,
      vatRatio: 0, discountRatio: 0, downPaymentRatio: 0,
      deliveryDays: 0, offerValidityDays: 0, productWarrantyMonths: 0,
      additional: [],
    },
    currencyCode: 'XOF',
  });
}

export function projectFileToView(project: ProjectFileV1): ProjectViewModel {
  const input = parseProjectInputsV1(project.inputs);
  const selected = project.selectedEquipmentIds;
  const profileViews = input.load.profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    color: profile.displayColor,
    source: profile.source === 'equipment' ? 'equipments' as const : profile.source,
    classic: profile.items.filter((item) => item.startupPowerMultiplier === null).map((item) => ({
      id: item.id, name: item.label, qty: item.quantity,
      unitPower: item.activePowerW, yield: item.efficiencyRatio ?? 0,
      opHours: item.operatingHoursPerDay,
    })),
    inductive: profile.items.filter((item) => item.startupPowerMultiplier !== null).map((item) => ({
      id: item.id, name: item.label, qty: item.quantity,
      unitPower: item.activePowerW, yield: item.efficiencyRatio ?? 0,
      opHours: item.operatingHoursPerDay,
      startupCoef: item.startupPowerMultiplier ?? 1,
    })),
    hourly: profile.hourlyPoints.map((point) => ({
      hour: point.hourIndex,
      realPower: point.activePowerW / 1000,
      peakPower: (point.peakPowerW ?? point.activePowerW) / 1000,
    })),
    meter: profile.meter === null ? null : {
      monthlyEnergy: valueOrZero(profile.meter.monthlyEnergyWh) / 1000,
      meterAmperage: valueOrZero(profile.meter.meterCurrentA),
      networkType: profile.meter.networkType === 'single-phase' ? 'single_phase' as const : 'three_phase' as const,
      morningPeakStart: profile.meter.morningPeak.startLocalTime,
      morningPeakEnd: profile.meter.morningPeak.endLocalTime,
      eveningPeakStart: profile.meter.eveningPeak.startLocalTime,
      eveningPeakEnd: profile.meter.eveningPeak.endLocalTime,
      peakImportance: valueOrZero(profile.meter.peakImportanceRatio),
      targetQualityFactor: valueOrZero(profile.meter.targetQualityFactor),
    },
  }));
  const ancillaryAbsolute = input.costing.cabling.mode === 'absolute';
  return {
    id: project.id,
    name: project.name,
    systemType: systemToView[project.system],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    currency: input.currencyCode,
    details: {
      clientName: input.details.clientName,
      clientAddress: input.details.clientAddress,
      clientTel: input.details.clientPhone,
      clientEmail: input.details.clientEmail,
      followerName: input.details.projectOfficerName,
      applicationType: input.details.applicationType,
      projectDate: input.details.projectDate ?? '',
      projectNumber: input.details.projectNumber,
      projectLocation: input.details.projectLocationLabel,
      projectImage: input.details.projectImageRef ?? '',
    },
    site: {
      country: '', countryCode: input.site.countryCode ?? '',
      localityId: input.site.localityId, region: input.site.regionLabel,
      latitude: valueOrZero(input.site.latitudeDeg),
      longitude: valueOrZero(input.site.longitudeDeg),
      tilt: valueOrZero(input.site.arrayTiltDeg),
      azimuth: valueOrZero(input.site.arrayAzimuthDeg),
      irradiation: 0,
      monthlyIrradiation: Array.from<number>({ length: 12 }).fill(0),
      weatherSourceId: input.site.weatherSourceId,
      irradiationBasis: null,
      downloadedSource: null,
    },
    load: {
      granularity: input.load.granularity,
      profiles: profileViews,
      activeProfileId: input.load.activeProfileId,
      irMin: valueOrZero(input.load.minimumOperatingIrradianceWPerM2),
    },
    assumptions: {
      lpspMax: percent(input.assumptions.maxLpspRatio),
      lolpMax: percent(input.assumptions.maxLolpRatio),
      systemPr: percent(input.assumptions.systemPerformanceRatio),
      inverterYield: percent(input.assumptions.inverterEfficiencyRatio),
      batteryYield: percent(input.assumptions.batteryEfficiencyRatio),
      batteryVoltage: valueOrZero(input.assumptions.batteryNominalVoltageV),
      batteryDod: percent(input.assumptions.batteryDodRatio),
      pvSpecificCost: valueOrZero(input.assumptions.pvSpecificCostMinorPerKw),
      pvMargin: percent(input.assumptions.pvMarginRatio),
      batterySpecificCost: valueOrZero(input.assumptions.batterySpecificCostMinorPerKwh),
      batteryMargin: percent(input.assumptions.batteryMarginRatio),
      inverterSpecificCost: valueOrZero(input.assumptions.inverterSpecificCostMinorPerKw),
      inverterMargin: percent(input.assumptions.inverterMarginRatio),
      projectLifetime: valueOrZero(input.assumptions.projectLifetimeYears),
      pvLifetime: valueOrZero(input.assumptions.pvLifetimeYears),
      batteryLifetime: valueOrZero(input.assumptions.batteryLifetimeYears),
      inverterLifetime: valueOrZero(input.assumptions.inverterLifetimeYears),
      pvMaintenance: percent(input.assumptions.pvMaintenanceRatioPerYear),
      batteryMaintenance: percent(input.assumptions.batteryMaintenanceRatioPerYear),
      inverterMaintenance: percent(input.assumptions.inverterMaintenanceRatioPerYear),
      actualizationRate: percent(input.assumptions.discountRateRatio),
      lcoeGrid: valueOrZero(input.assumptions.gridTariffMinorPerKwh),
      emissionFactor: valueOrZero(input.assumptions.gridEmissionKgCo2PerKwh),
      autoConsumptionRate: percent(input.assumptions.selfConsumptionRatio),
      dieselSpecificCost: valueOrZero(input.assumptions.dieselSpecificCostMinorPerKw),
    },
    selection: {
      moduleId: selected[0] ?? null,
      batteryId: selected[1] ?? null,
      inverterId: selected[2] ?? null,
    },
    cables: input.cableChoices.map((choice) => ({
      segment: choice.segment.replaceAll('-', '_') as ProjectViewModel['cables'][number]['segment'],
      length: valueOrZero(choice.lengthM), material: choice.material,
      installation: choice.installation.replace('-', '_') as ProjectViewModel['cables'][number]['installation'],
    })),
    protections: input.protectionChoices.map((choice) => ({
      segment: choice.segment.replaceAll('-', '_') as ProjectViewModel['protections'][number]['segment'],
      caliberA: choice.ratingA,
    })),
    costing: {
      useGlobalCost: input.costing.useGlobalCost,
      moduleUnitPrice: input.costing.moduleUnitPriceMinor,
      moduleMargin: percent(input.costing.moduleMarginRatio),
      batteryUnitPrice: input.costing.batteryUnitPriceMinor,
      batteryMargin: percent(input.costing.batteryMarginRatio),
      inverterUnitPrice: input.costing.inverterUnitPriceMinor,
      inverterMargin: percent(input.costing.inverterMarginRatio),
      definedCostForAccessories: ancillaryAbsolute,
      cablingPrice: costValue(input.costing.cabling),
      cablingMargin: percent(input.costing.cablingMarginRatio),
      electricalBoxPrice: costValue(input.costing.electricalBox),
      electricalBoxMargin: percent(input.costing.electricalBoxMarginRatio),
      supportsPrice: costValue(input.costing.supports),
      supportsMargin: percent(input.costing.supportsMarginRatio),
      transportPrice: costValue(input.costing.transport),
      transportMargin: percent(input.costing.transportMarginRatio),
      installationPrice: costValue(input.costing.installation),
      installationMargin: percent(input.costing.installationMarginRatio),
      tvaPercent: percent(input.costing.vatRatio),
      reductionPercent: percent(input.costing.discountRatio),
      downPaymentPercent: percent(input.costing.downPaymentRatio),
      deliveryTime: input.costing.deliveryDays,
      offerValidity: input.costing.offerValidityDays,
      productWarranty: input.costing.productWarrantyMonths,
      additional: input.costing.additional.map((item) => ({
        id: item.id, name: item.name, description: item.description,
        quantity: item.quantity, costPrice: item.unitCostMinor,
        marginPercent: percent(item.marginRatio),
      })),
    },
  };
}

export function projectViewToFile(view: ProjectViewModel): ProjectFileV1 {
  const input = parseProjectInputsV1({
    schemaVersion: 1,
    details: {
      clientName: view.details.clientName,
      clientAddress: view.details.clientAddress,
      clientPhone: view.details.clientTel,
      clientEmail: view.details.clientEmail,
      projectOfficerName: view.details.followerName,
      applicationType: view.details.applicationType,
      projectDate: view.details.projectDate || null,
      projectNumber: view.details.projectNumber,
      projectLocationLabel: view.details.projectLocation,
      projectImageRef: view.details.projectImage || null,
    },
    site: {
      countryCode: view.site.countryCode || null,
      localityId: view.site.localityId,
      regionLabel: view.site.region,
      latitudeDeg: view.site.localityId === null && view.site.latitude === 0 ? null : view.site.latitude,
      longitudeDeg: view.site.localityId === null && view.site.longitude === 0 ? null : view.site.longitude,
      arrayTiltDeg: view.site.tilt,
      arrayAzimuthDeg: view.site.azimuth,
      weatherSourceId: view.site.weatherSourceId,
    },
    load: {
      granularity: view.load.granularity,
      activeProfileId: view.load.activeProfileId,
      minimumOperatingIrradianceWPerM2: view.load.irMin,
      profiles: view.load.profiles.map((profile) => ({
        id: profile.id, name: profile.name, displayColor: profile.color,
        source: profile.source === 'equipments' ? 'equipment' : profile.source,
        items: [
          ...profile.classic.map((item) => ({
            id: item.id, label: item.name, quantity: item.qty,
            activePowerW: item.unitPower, powerFactor: null,
            simultaneityRatio: null, efficiencyRatio: item.yield,
            operatingHoursPerDay: item.opHours, startupPowerMultiplier: null,
          })),
          ...profile.inductive.map((item) => ({
            id: item.id, label: item.name, quantity: item.qty,
            activePowerW: item.unitPower, powerFactor: null,
            simultaneityRatio: null, efficiencyRatio: item.yield,
            operatingHoursPerDay: item.opHours,
            startupPowerMultiplier: item.startupCoef,
          })),
        ],
        hourlyPoints: profile.hourly.map((point) => ({
          hourIndex: point.hour,
          activePowerW: point.realPower * 1000,
          peakPowerW: point.peakPower * 1000,
        })),
        meter: profile.meter === null ? null : {
          monthlyEnergyWh: profile.meter.monthlyEnergy * 1000,
          meterCurrentA: profile.meter.meterAmperage,
          networkType: profile.meter.networkType === 'single_phase' ? 'single-phase' : 'three-phase',
          morningPeak: {
            startLocalTime: profile.meter.morningPeakStart,
            endLocalTime: profile.meter.morningPeakEnd,
          },
          eveningPeak: {
            startLocalTime: profile.meter.eveningPeakStart,
            endLocalTime: profile.meter.eveningPeakEnd,
          },
          peakImportanceRatio: profile.meter.peakImportance,
          targetQualityFactor: profile.meter.targetQualityFactor,
        },
      })),
    },
    assumptions: {
      maxLpspRatio: ratio(view.assumptions.lpspMax),
      maxLolpRatio: ratio(view.assumptions.lolpMax),
      systemPerformanceRatio: ratio(view.assumptions.systemPr),
      inverterEfficiencyRatio: ratio(view.assumptions.inverterYield),
      batteryEfficiencyRatio: ratio(view.assumptions.batteryYield),
      batteryNominalVoltageV: view.assumptions.batteryVoltage || null,
      batteryDodRatio: ratio(view.assumptions.batteryDod),
      pvSpecificCostMinorPerKw: Math.round(view.assumptions.pvSpecificCost),
      pvMarginRatio: ratio(view.assumptions.pvMargin),
      batterySpecificCostMinorPerKwh: Math.round(view.assumptions.batterySpecificCost),
      batteryMarginRatio: ratio(view.assumptions.batteryMargin),
      inverterSpecificCostMinorPerKw: Math.round(view.assumptions.inverterSpecificCost),
      inverterMarginRatio: ratio(view.assumptions.inverterMargin),
      projectLifetimeYears: Math.round(view.assumptions.projectLifetime),
      pvLifetimeYears: Math.round(view.assumptions.pvLifetime),
      batteryLifetimeYears: Math.round(view.assumptions.batteryLifetime),
      inverterLifetimeYears: Math.round(view.assumptions.inverterLifetime),
      pvMaintenanceRatioPerYear: ratio(view.assumptions.pvMaintenance),
      batteryMaintenanceRatioPerYear: ratio(view.assumptions.batteryMaintenance),
      inverterMaintenanceRatioPerYear: ratio(view.assumptions.inverterMaintenance),
      discountRateRatio: ratio(view.assumptions.actualizationRate),
      gridTariffMinorPerKwh: Math.round(view.assumptions.lcoeGrid),
      gridEmissionKgCo2PerKwh: view.assumptions.emissionFactor,
      selfConsumptionRatio: ratio(view.assumptions.autoConsumptionRate),
      dieselSpecificCostMinorPerKw: Math.round(view.assumptions.dieselSpecificCost),
    },
    cableChoices: view.cables.map((choice) => ({
      segment: choice.segment.replaceAll('_', '-'),
      lengthM: choice.length,
      material: choice.material,
      installation: choice.installation.replaceAll('_', '-'),
    })),
    protectionChoices: view.protections.map((choice) => ({
      segment: choice.segment.replaceAll('_', '-'),
      ratingA: choice.caliberA,
    })),
    costing: {
      useGlobalCost: view.costing.useGlobalCost,
      moduleUnitPriceMinor: Math.round(view.costing.moduleUnitPrice),
      moduleMarginRatio: ratio(view.costing.moduleMargin),
      batteryUnitPriceMinor: Math.round(view.costing.batteryUnitPrice),
      batteryMarginRatio: ratio(view.costing.batteryMargin),
      inverterUnitPriceMinor: Math.round(view.costing.inverterUnitPrice),
      inverterMarginRatio: ratio(view.costing.inverterMargin),
      cabling: absoluteOrRatio(view.costing.cablingPrice, view.costing.definedCostForAccessories),
      electricalBox: absoluteOrRatio(view.costing.electricalBoxPrice, view.costing.definedCostForAccessories),
      supports: absoluteOrRatio(view.costing.supportsPrice, view.costing.definedCostForAccessories),
      transport: absoluteOrRatio(view.costing.transportPrice, view.costing.definedCostForAccessories),
      installation: absoluteOrRatio(view.costing.installationPrice, view.costing.definedCostForAccessories),
      cablingMarginRatio: ratio(view.costing.cablingMargin),
      electricalBoxMarginRatio: ratio(view.costing.electricalBoxMargin),
      supportsMarginRatio: ratio(view.costing.supportsMargin),
      transportMarginRatio: ratio(view.costing.transportMargin),
      installationMarginRatio: ratio(view.costing.installationMargin),
      vatRatio: ratio(view.costing.tvaPercent),
      discountRatio: ratio(view.costing.reductionPercent),
      downPaymentRatio: ratio(view.costing.downPaymentPercent),
      deliveryDays: Math.round(view.costing.deliveryTime),
      offerValidityDays: Math.round(view.costing.offerValidity),
      productWarrantyMonths: Math.round(view.costing.productWarranty),
      additional: view.costing.additional.map((item) => ({
        id: item.id, name: item.name, description: item.description,
        quantity: item.quantity, unitCostMinor: Math.round(item.costPrice),
        marginRatio: ratio(item.marginPercent),
      })),
    },
    currencyCode: view.currency,
  });
  return parseProjectFile({
    schemaVersion: 1,
    id: view.id,
    name: view.name.trim() || 'Projet sans nom',
    system: systemTypeToCanonical(view.systemType),
    createdAt: view.createdAt,
    updatedAt: view.updatedAt,
    inputs: input,
    selectedEquipmentIds: [view.selection.moduleId, view.selection.batteryId, view.selection.inverterId]
      .filter((id): id is string => id !== null),
    lastCalculation: null,
  });
}

export function createEmptyProjectFile(
  id: string,
  system: SystemKind,
  timestamp: string,
  name: string,
): ProjectFileV1 {
  return parseProjectFile({
    schemaVersion: 1, id, name, system,
    createdAt: timestamp, updatedAt: timestamp,
    inputs: createEmptyProjectInputs(),
    selectedEquipmentIds: [], lastCalculation: null,
  });
}
