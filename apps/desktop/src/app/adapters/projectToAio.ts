import type { AioSizingRequestV1, Locality, NormalizedHourlyProfile, Provenance, WeatherSource } from '@ksd/domain';
import { adjustHourlyFractionsToGamma, analyzeSolarResource, buildAnnualLoadSeries, calculateAnnualYEn, normalizeDirectHourlyRows, normalizeEquipmentRows, normalizeMeterReading, resolveAnnualAssignment, type AnnualHourlyProfile, type FinanceInputV1, type LoadInputIssue, type LoadWarning, type Page1LoadNormalization, type PresizingInputV1, type SizingInputV1, type SizingOutputV1, type SolarResourceAnalysisEnvelopeV1 } from '@ksd/engine';
import type { Equipment } from '@ksd/catalog';
import type { ProjectFileV1 } from '@ksd/project-format';
import { parseProjectInputsV1, type ProjectInputsV1 } from '../models/projectInputs.js';
import { PRESIZING_DEFAULTS } from '../models/projectAdapters.js';

interface Page1References {
  readonly localities: readonly Locality[];
  readonly weatherSources: readonly WeatherSource[];
  readonly loadProfiles: readonly NormalizedHourlyProfile[];
}

export type ProjectToAioResult =
  | { readonly status: 'ready'; readonly input: AioSizingRequestV1; readonly warnings: readonly LoadWarning[]; readonly solarAnalysis: SolarResourceAnalysisEnvelopeV1 | null }
  | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] };

export async function projectToAioInput(project: ProjectFileV1, references: Page1References): Promise<ProjectToAioResult> {
  const input = parseProjectInputsV1(project.inputs);
  if (input.site.timezoneIana === null) return blocked('SITE_TIMEZONE_MISSING', 'site.timezoneIana', 'A project timezone is required to align the 24-hour load profile');

  const resourceOnly = analyzeProjectSolar(input, null, references);
  const normalized = normalizeActiveLoad(input, references, resourceOnly?.output.meanHourlyPoaWm2 ?? null);
  if (normalized.status === 'blocked') return normalized;

  const projectProvenance = await declaredProvenance('project-page1-input', project.id, input);
  const locality = references.localities.find((candidate) => candidate.id === input.site.localityId);
  const weatherSource = references.weatherSources.find((candidate) => candidate.id === input.site.weatherSourceId);
  const resource = input.site.solarResource;
  const solarAnalysis = analyzeProjectSolar(input, normalized, references);
  const solarProvenance = solarAnalysis?.provenance[0] ?? null;
  const designMonth = input.site.designMonth;
  const selectedPoa = designMonth === null ? null : solarAnalysis?.output.monthlyAverageDailyPoaKWhM2Day[designMonth - 1] ?? null;

  const request: AioSizingRequestV1 = {
    schemaVersion: 1,
    technicalContext: {
      applicationType: input.details.applicationType,
      site: {
        ...(locality === undefined ? {} : { localityId: locality.id }),
        ...(input.site.latitudeDeg === null ? {} : { latitudeDeg: input.site.latitudeDeg }),
        ...(input.site.longitudeDeg === null ? {} : { longitudeDeg: input.site.longitudeDeg }),
        ...(input.site.arrayTiltDeg === null ? {} : { arrayTiltDeg: input.site.arrayTiltDeg }),
        ...(input.site.arrayAzimuthDeg === null ? {} : { arrayAzimuthDeg: input.site.arrayAzimuthDeg }),
      },
    },
    load: normalized.load,
    ...(solarAnalysis !== null && designMonth !== null && selectedPoa !== null && selectedPoa > 0 && resource !== null && solarProvenance !== null ? {
      solarDesignResource: {
        selectionMethod: 'declared-critical-month' as const,
        referencePeriod: { yearOrTypicalPeriod: resource.versionOrDate, month: designMonth },
        planeOfArrayIrradiationKWhPerM2PerDay: selectedPoa,
        arrayTiltDeg: resource.arrayTiltDeg,
        arrayAzimuthDeg: resource.arrayAzimuthDeg,
        source: {
          provider: resource.provider,
          datasetOrDocument: resource.datasetOrDocument,
          versionOrDate: resource.versionOrDate,
          locator: resource.locator,
          retrievedAtIso: resource.retrievedAtIso,
        },
        timeConvention: { timezoneIana: input.site.timezoneIana, timestampConvention: 'interval-center' as const, intervalMinutes: 60 },
        qualityFlags: resource.qualityFlags,
        provenance: solarProvenance,
      },
    } : {}),
    assumptions: { batteryChemistry: 'unknown', assumptionSources: [] },
    provenance: [projectProvenance, ...(locality === undefined ? [] : [locality.provenance]), ...(weatherSource === undefined ? [] : [weatherSource.provenance]), ...(solarProvenance === null ? [] : [solarProvenance])],
  };
  return { status: 'ready', input: request, warnings: normalized.warnings, solarAnalysis };
}

export async function projectToPresizingInput(project: ProjectFileV1, references: Page1References): Promise<{ readonly status: 'ready'; readonly input: PresizingInputV1 } | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] }> {
  const adapted = await projectToAioInput(project, references);
  if (adapted.status === 'blocked') return adapted;
  const solar = adapted.solarAnalysis;
  if (solar === null) return { status: 'blocked', issues: [{ code: 'WEATHER_FILE_MISSING', path: 'site.solarResource', message: 'Local hourly weather data is required' }] };
  const gamma = solar.output.annualGamma?.status === 'available' ? solar.output.annualGamma : solar.output.gamma;
  if (gamma.status !== 'available') return { status: 'blocked', issues: [{ code: 'YEN_UNAVAILABLE', path: 'load.activeProfileId', message: 'YEn requires a non-zero active load profile' }] };
  const gammaValue = 'annualGammaRatio' in gamma ? gamma.annualGammaRatio : gamma.value;
  const storedAssumptions = parseProjectInputsV1(project.inputs).assumptions;
  const assumptions = {
    ...storedAssumptions,
    maxLpspRatio: storedAssumptions.maxLpspRatio ?? PRESIZING_DEFAULTS.maxLpspRatio,
    maxLolpRatio: storedAssumptions.maxLolpRatio ?? PRESIZING_DEFAULTS.maxLolpRatio,
    systemPerformanceRatio: storedAssumptions.systemPerformanceRatio ?? PRESIZING_DEFAULTS.systemPerformanceRatio,
    inverterEfficiencyRatio: storedAssumptions.inverterEfficiencyRatio ?? PRESIZING_DEFAULTS.inverterEfficiencyRatio,
    batteryEfficiencyRatio: storedAssumptions.batteryEfficiencyRatio ?? PRESIZING_DEFAULTS.batteryEfficiencyRatio,
    pvSpecificCostMinorPerKw: storedAssumptions.pvSpecificCostMinorPerKw ?? PRESIZING_DEFAULTS.pvSpecificCostMinorPerKw,
    pvMarginRatio: storedAssumptions.pvMarginRatio ?? PRESIZING_DEFAULTS.pvMarginRatio,
    batterySpecificCostMinorPerKwh: storedAssumptions.batterySpecificCostMinorPerKwh ?? PRESIZING_DEFAULTS.batterySpecificCostMinorPerKwh,
    batteryMarginRatio: storedAssumptions.batteryMarginRatio ?? PRESIZING_DEFAULTS.batteryMarginRatio,
    inverterSpecificCostMinorPerKw: storedAssumptions.inverterSpecificCostMinorPerKw ?? PRESIZING_DEFAULTS.inverterSpecificCostMinorPerKw,
    inverterMarginRatio: storedAssumptions.inverterMarginRatio ?? PRESIZING_DEFAULTS.inverterMarginRatio,
    gridTariffMinorPerKwh: storedAssumptions.gridTariffMinorPerKwh ?? PRESIZING_DEFAULTS.gridTariffMinorPerKwh,
    gridEmissionKgCo2PerKwh: storedAssumptions.gridEmissionKgCo2PerKwh ?? PRESIZING_DEFAULTS.gridEmissionKgCo2PerKwh,
  };
  const required = {
    lpspMax: assumptions.maxLpspRatio, lolpMax: assumptions.maxLolpRatio, systemPr: assumptions.systemPerformanceRatio,
    inverterEfficiency: assumptions.inverterEfficiencyRatio, batteryEfficiency: assumptions.batteryEfficiencyRatio,
    pvCost: assumptions.pvSpecificCostMinorPerKw, batteryCost: assumptions.batterySpecificCostMinorPerKwh,
    inverterCost: assumptions.inverterSpecificCostMinorPerKw, tariff: assumptions.gridTariffMinorPerKwh, emission: assumptions.gridEmissionKgCo2PerKwh,
  };
  const missing = Object.entries(required).filter(([, value]) => value === null).map(([key]) => key);
  if (missing.length > 0) return { status: 'blocked', issues: [{ code: 'PRESIZING_ASSUMPTIONS_MISSING', path: `assumptions.${missing.join(',')}`, message: 'All pre-sizing assumptions are required' }] };
  const value = required as { readonly [Key in keyof typeof required]: number };
  const load = adapted.input.load;
  const peakPowerW = solar.output.loadHourlyPeakPowerW === null ? Math.max(...load.hourlyEnergyWh) : Math.max(...solar.output.loadHourlyPeakPowerW);
  // La journée normalisée dimensionne (formules analytiques journalières) ;
  // l'année réelle, quand elle existe, simule. Les deux ne se remplacent pas :
  // c'est la simulation qui produit LPSP, LOLP et SRI, et elle n'a aucune
  // raison de lire une moyenne quand l'utilisateur a fourni ses 8 760 heures.
  const annual = annualHourlyLoadWh(parseProjectInputsV1(project.inputs));
  return { status: 'ready', input: {
    dailyEnergyWh: load.hourlyEnergyWh.reduce((sum, item) => sum + item, 0), yEn: gammaValue,
    hourlyLoadWh: annual ?? load.hourlyEnergyWh,
    hourlyPoaWm2: solar.output.hourlyPoaWm2, peakPowerW, lpspMax: value.lpspMax, lolpMax: value.lolpMax, systemPr: value.systemPr,
    inverterEfficiency: value.inverterEfficiency, batteryEfficiency: value.batteryEfficiency,
    pvSpecificCostPerKw: value.pvCost * (1 + assumptions.pvMarginRatio),
    batterySpecificCostPerKwh: value.batteryCost * (1 + assumptions.batteryMarginRatio),
    inverterSpecificCostPerKw: value.inverterCost * (1 + assumptions.inverterMarginRatio),
    gridTariffPerKwh: value.tariff, emissionFactorKgPerKwh: value.emission,
    projectLifetimeYears: assumptions.projectLifetimeYears ?? PRESIZING_DEFAULTS.projectLifetimeYears,
    pvLifetimeYears: assumptions.pvLifetimeYears ?? PRESIZING_DEFAULTS.pvLifetimeYears,
    batteryLifetimeYears: assumptions.batteryLifetimeYears ?? PRESIZING_DEFAULTS.batteryLifetimeYears,
    inverterLifetimeYears: assumptions.inverterLifetimeYears ?? PRESIZING_DEFAULTS.inverterLifetimeYears,
    pvMaintenanceRatioPerYear: assumptions.pvMaintenanceRatioPerYear ?? PRESIZING_DEFAULTS.pvMaintenanceRatioPerYear,
    batteryMaintenanceRatioPerYear: assumptions.batteryMaintenanceRatioPerYear ?? PRESIZING_DEFAULTS.batteryMaintenanceRatioPerYear,
    inverterMaintenanceRatioPerYear: assumptions.inverterMaintenanceRatioPerYear ?? PRESIZING_DEFAULTS.inverterMaintenanceRatioPerYear,
    discountRateRatio: assumptions.discountRateRatio ?? PRESIZING_DEFAULTS.discountRateRatio,
  } };
}

export function projectToSizingInput(project: ProjectFileV1, equipment: readonly Equipment[]): { readonly status: 'ready'; readonly input: SizingInputV1 } | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] } {
  const assumptions = parseProjectInputsV1(project.inputs).assumptions;
  const module = equipment.filter((item): item is Extract<Equipment, { kind: 'pv-module' }> => item.kind === 'pv-module').find((item) => item.id === project.selectedEquipmentIds[0]);
  const battery = equipment.filter((item): item is Extract<Equipment, { kind: 'battery' }> => item.kind === 'battery').find((item) => item.id === project.selectedEquipmentIds[1]);
  const inverter = equipment.filter((item): item is Extract<Equipment, { kind: 'inverter' }> => item.kind === 'inverter').find((item) => item.id === project.selectedEquipmentIds[2]);
  if (project.lastCalculation === null || typeof project.lastCalculation.output !== 'object' || project.lastCalculation.output === null) return { status: 'blocked', issues: [{ code: 'PRESIZING_NOT_RUN', path: 'lastCalculation', message: 'A valid pre-sizing result is required' }] };
  if (module === undefined || battery === undefined || inverter === undefined) return { status: 'blocked', issues: [{ code: 'EQUIPMENT_SELECTION_INCOMPLETE', path: 'selectedEquipmentIds', message: 'A module, battery and inverter must be selected' }] };
  const presizing = project.lastCalculation.output as { selected?: { pvPeakKw?: number; storageKwh?: number; inverterKw?: number } };
  if (presizing.selected?.pvPeakKw === undefined || presizing.selected.storageKwh === undefined || presizing.selected.inverterKw === undefined) return { status: 'blocked', issues: [{ code: 'PRESIZING_OUTPUT_INVALID', path: 'lastCalculation.output', message: 'The pre-sizing result has no usable requirements' }] };
  return { status: 'ready', input: { requiredPvPowerKw: presizing.selected.pvPeakKw, requiredStorageKwh: presizing.selected.storageKwh, requiredInverterPowerKw: presizing.selected.inverterKw, coldTemperatureC: 0, referenceTemperatureC: 25, temperatureCoefficientDefaultPerC: 0.003, estimatedCosts: { pvSpecificCostMinorPerKw: withMargin(assumptions.pvSpecificCostMinorPerKw, assumptions.pvMarginRatio), storageSpecificCostMinorPerKwh: withMargin(assumptions.batterySpecificCostMinorPerKwh, assumptions.batteryMarginRatio), inverterSpecificCostMinorPerKw: withMargin(assumptions.inverterSpecificCostMinorPerKw, assumptions.inverterMarginRatio) }, selectedEquipment: { module: { id: module.id, powerW: module.nominalPowerW, vmpV: module.voltageAtMaximumPowerV, vocV: module.openCircuitVoltageV, iscA: module.shortCircuitCurrentA, vocTemperatureCoefficientPerC: module.temperatureCoefficientVocPerC }, battery: { id: battery.id, voltageV: battery.nominalVoltageV, capacityAh: battery.nominalCapacityAh, energyWh: battery.nominalEnergyWh, usableDodRatio: battery.usableDepthOfDischargeRatio }, inverter: { id: inverter.id, acPowerW: inverter.nominalAcPowerW, dcVoltageV: inverter.nominalDcVoltageV, surgePowerW: inverter.surgePowerW, mpptMinV: inverter.mpptMinVoltageV, mpptMaxV: inverter.mpptMaxVoltageV, pvMaxPowerW: inverter.pvArrayMaxPowerW, vocMaxV: inverter.pvOpenCircuitMaxVoltageV, maxChargingCurrentA: inverter.maxChargingCurrentA, maxParallelUnits: inverter.maxParallelUnits, canBeInParallel: inverter.canBeInParallel } } } };
}

function withMargin(cost: number | null | undefined, margin: number | null | undefined): number | null { return cost === null || cost === undefined ? null : Math.round(cost * (1 + (margin ?? 0))); }

export async function projectToFinanceInput(project: ProjectFileV1, references: Page1References): Promise<{ readonly status: 'ready'; readonly input: FinanceInputV1 } | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] }> {
  const presizing = await projectToPresizingInput(project, references);
  if (presizing.status === 'blocked') return { status: 'blocked', issues: presizing.issues };
  const sizing = project.sizingCalculation?.output as SizingOutputV1 | undefined;
  if (sizing === undefined || !sizing.valid) return { status: 'blocked', issues: [{ code: 'SIZING_NOT_RUN', path: 'sizingCalculation', message: 'A valid retained system is required before financial evaluation' }] };
  const stored = parseProjectInputsV1(project.inputs);
  const c = stored.costing;
  const assumptions = stored.assumptions;
  const costingNotInitialized = c.moduleUnitPriceMinor === 0 && c.batteryUnitPriceMinor === 0 && c.inverterUnitPriceMinor === 0;
  const moduleUnitCost = c.moduleUnitPriceMinor > 0 ? c.moduleUnitPriceMinor : sizing.pv.obtainedPowerKwc / Math.max(sizing.pv.totalModules, 1) * (assumptions.pvSpecificCostMinorPerKw ?? PRESIZING_DEFAULTS.pvSpecificCostMinorPerKw);
  const batteryUnitCost = c.batteryUnitPriceMinor > 0 ? c.batteryUnitPriceMinor : sizing.battery.obtainedEnergyKwh / Math.max(sizing.battery.totalUnits, 1) * (assumptions.batterySpecificCostMinorPerKwh ?? PRESIZING_DEFAULTS.batterySpecificCostMinorPerKwh);
  const inverterUnitCost = c.inverterUnitPriceMinor > 0 ? c.inverterUnitPriceMinor : sizing.inverter.obtainedPowerKw / Math.max(sizing.inverter.count, 1) * (assumptions.inverterSpecificCostMinorPerKw ?? PRESIZING_DEFAULTS.inverterSpecificCostMinorPerKw);
  const main = [
    { key: 'modules', label: 'Modules', quantity: sizing.pv.totalModules, unitCost: moduleUnitCost, marginRatio: costingNotInitialized ? (assumptions.pvMarginRatio ?? PRESIZING_DEFAULTS.pvMarginRatio ?? 0) : c.moduleMarginRatio },
    { key: 'batteries', label: 'Batteries', quantity: sizing.battery.totalUnits, unitCost: batteryUnitCost, marginRatio: costingNotInitialized ? (assumptions.batteryMarginRatio ?? PRESIZING_DEFAULTS.batteryMarginRatio ?? 0) : c.batteryMarginRatio },
    { key: 'inverters', label: 'Onduleurs', quantity: sizing.inverter.count, unitCost: inverterUnitCost, marginRatio: costingNotInitialized ? (assumptions.inverterMarginRatio ?? PRESIZING_DEFAULTS.inverterMarginRatio ?? 0) : c.inverterMarginRatio },
  ];
  const mainCost = main.reduce((total, line) => total + line.quantity * line.unitCost, 0);
  const ancillary = (key: string, label: string, value: typeof c.cabling, marginRatio: number) => ({ key, label, quantity: 1, unitCost: value.mode === 'absolute' ? value.amountMinor : mainCost * value.ratio, marginRatio });
  const p = presizing.input;
  return { status: 'ready', input: {
    lines: [...main, ancillary('cabling', 'Câblage', c.cabling, c.cablingMarginRatio), ancillary('electricalBox', 'Coffret électrique', c.electricalBox, c.electricalBoxMarginRatio), ancillary('supports', 'Supports', c.supports, c.supportsMarginRatio), ancillary('transport', 'Transport', c.transport, c.transportMarginRatio), ancillary('installation', 'Installation', c.installation, c.installationMarginRatio), ...c.additional.map((line) => ({ key: line.id, label: line.name, quantity: line.quantity, unitCost: line.unitCostMinor, marginRatio: line.marginRatio }))],
    vatRatio: c.vatRatio, discountRatio: c.discountRatio, downPaymentRatio: c.downPaymentRatio,
    pvPeakKw: sizing.pv.obtainedPowerKwc, storageKwh: sizing.battery.usefulEnergyKwh, inverterKw: sizing.inverter.obtainedPowerKw,
    hourlyLoadKwh: p.hourlyLoadWh.map((value) => value / 1000), hourlyPoaWm2: p.hourlyPoaWm2,
    systemPerformanceRatio: p.systemPr, inverterEfficiencyRatio: p.inverterEfficiency, batteryEfficiencyRatio: p.batteryEfficiency,
    projectLifetimeYears: p.projectLifetimeYears, batteryLifetimeYears: p.batteryLifetimeYears, inverterLifetimeYears: p.inverterLifetimeYears,
    pvMaintenanceRatioPerYear: p.pvMaintenanceRatioPerYear, batteryMaintenanceRatioPerYear: p.batteryMaintenanceRatioPerYear, inverterMaintenanceRatioPerYear: p.inverterMaintenanceRatioPerYear,
    discountRateRatio: p.discountRateRatio, gridTariffPerKwh: p.gridTariffPerKwh, emissionFactorKgPerKwh: p.emissionFactorKgPerKwh,
    selfConsumptionRatio: assumptions.selfConsumptionRatio ?? PRESIZING_DEFAULTS.selfConsumptionRatio, dieselSpecificCostPerKw: assumptions.dieselSpecificCostMinorPerKw ?? PRESIZING_DEFAULTS.dieselSpecificCostMinorPerKw,
  } };
}

/** Site can calculate the real solar resource before the user has entered a valid load; gamma then remains unavailable. */
export function projectToSolarAnalysis(project: ProjectFileV1, references: Page1References): SolarResourceAnalysisEnvelopeV1 | null {
  const input = parseProjectInputsV1(project.inputs);
  const resourceOnly = analyzeProjectSolar(input, null);
  return analyzeProjectSolar(input, normalizeActiveLoad(input, references, resourceOnly?.output.meanHourlyPoaWm2 ?? null), references);
}

/**
 * Série annuelle du profil actif, si l'utilisateur en a importé une.
 *
 * Seul le mode « profil horaire » peut en porter une : un inventaire décrit
 * des appareils, une facture une moyenne, et des profils composés des types de
 * jour — aucun des trois ne connaît l'heure 4 812 de l'année.
 */
function annualHourlyLoadWh(input: ProjectInputsV1): readonly number[] | null {
  if (input.load.activeMode === 'composed') return null;
  const profile = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId);
  if (profile === undefined || profile.source !== 'hourly' || profile.hourlyPoints.length !== 8_760) return null;
  const series = Array.from({ length: 8_760 }, () => 0);
  for (const point of profile.hourlyPoints) series[point.hourIndex] = point.activePowerW;
  return series;
}

function normalizeActiveLoad(input: ProjectInputsV1, references: Page1References, meanHourlyPoaWm2: readonly number[] | null): Page1LoadNormalization {
  if (input.load.activeMode === 'composed' && input.load.composed !== undefined && input.load.composed !== null) {
    const profileId = input.load.composed.calendar.assignments[0]?.profileId;
    const composedProfile = input.load.composed.profiles.find((candidate) => candidate.id === profileId) ?? input.load.composed.profiles[0];
    if (composedProfile === undefined) return { status: 'blocked', issues: [{ code: 'COMPOSED_PROFILE_MISSING', path: 'load.composed.profiles', message: 'At least one composed profile is required' }] };
    if (input.site.timezoneIana === null) return { status: 'blocked', issues: [{ code: 'SITE_TIMEZONE_MISSING', path: 'site.timezoneIana', message: 'A project timezone is required' }] };
    const typicalDay = composedTypicalDay(input.load.composed, composedProfile.id);
    return normalizeDirectHourlyRows({ timezoneIana: input.site.timezoneIana, hourlyPowerW: typicalDay.hourlyPowerW, hourlyPeakPowerW: typicalDay.hourlyPeakPowerW });
  }
  const profile = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId)!;
  if (input.site.timezoneIana === null) return { status: 'blocked', issues: [{ code: 'SITE_TIMEZONE_MISSING', path: 'site.timezoneIana', message: 'A project timezone is required' }] };
  return profile.source === 'equipment'
    ? normalizeEquipmentRows({ timezoneIana: input.site.timezoneIana, rows: profile.items.map((item) => ({
      id: item.id, label: item.label, quantity: item.quantity, usefulPowerW: item.usefulPowerW,
      efficiencyRatio: item.efficiencyRatio, simultaneityRatio: item.simultaneityRatio,
      hourlyOperatingFractions: item.hourlyOperatingFractions, startupPowerMultiplier: item.startupPowerMultiplier,
    })) })
    : profile.source === 'hourly'
      ? normalizeDirectHourlyRows({ timezoneIana: input.site.timezoneIana, hourlyPowerW: profile.hourlyPoints.map((point) => point.activePowerW), hourlyPeakPowerW: profile.hourlyPoints.map((point) => point.peakPowerW) })
      : normalizeMeterLoad(input, references, meanHourlyPoaWm2);
}

function composedTypicalDay(composed: NonNullable<ProjectInputsV1['load']['composed']>, fallbackProfileId: string) {
  const profiles = new Map(composed.profiles.map((profile) => [profile.id, profile]));
  const totals = Array.from({ length: 24 }, () => 0);
  const peaks = Array.from({ length: 24 }, () => 0);
  let dayCount = 0;
  for (let month = 0; month < 12; month += 1) {
    const count = new Date(Date.UTC(2021, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= count; day += 1) {
      const dateIso = `2021-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const assignment = resolveAnnualAssignment(composed.calendar, dateIso);
      const profile = profiles.get(assignment === null ? fallbackProfileId : composed.calendar.assignments.find((item) => item.periodId === assignment.periodId && item.dayGroupId === assignment.dayGroupId)?.profileId ?? fallbackProfileId) ?? profiles.get(fallbackProfileId);
      if (profile === undefined) continue;
      dayCount += 1;
      profile.hourlyPoints.forEach((point) => { totals[point.hourIndex] += point.activePowerW; peaks[point.hourIndex] += point.peakPowerW ?? point.activePowerW; });
    }
  }
  const divisor = Math.max(1, dayCount);
  return { hourlyPowerW: totals.map((value) => value / divisor), hourlyPeakPowerW: peaks.map((value) => value / divisor) };
}

function normalizeMeterLoad(input: ProjectInputsV1, references: Page1References, meanHourlyPoaWm2: readonly number[] | null): Page1LoadNormalization {
  const meter = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId)!.meter;
  const sourceProfile = references.loadProfiles.find((candidate) => candidate.id === meter?.normalizedProfileId) ?? null;
  let adjustedFractions: readonly number[] | undefined;
  if (meter?.forceYEn) {
    if (sourceProfile === null || meter.targetYEn === null) return { status: 'blocked', issues: [{ code: 'YEN_TARGET_MISSING', path: 'meter.targetYEn', message: 'A sourced profile and a YEn target are required' }] };
    if (meanHourlyPoaWm2 === null) return { status: 'blocked', issues: [{ code: 'YEN_WEATHER_MISSING', path: 'site.solarResource', message: 'Local weather data is required to force YEn' }] };
    const adjustment = adjustHourlyFractionsToGamma({ hourlyEnergyFractions: sourceProfile.hourlyEnergyFractions, meanHourlyPoaWm2, thresholdWm2: input.load.minimumOperatingIrradianceWPerM2 ?? 10, targetGamma: meter.targetYEn });
    if (adjustment.status === 'blocked') return { status: 'blocked', issues: [{ code: adjustment.code, path: 'meter.targetYEn', message: adjustment.message }] };
    adjustedFractions = adjustment.hourlyEnergyFractions;
  }
  const normalized = normalizeMeterReading({ timezoneIana: input.site.timezoneIana!, observedEnergyWh: meter?.observedEnergyWh ?? null, observedDays: meter?.observedDays ?? null, profile: sourceProfile, ...(adjustedFractions === undefined ? {} : { hourlyEnergyFractions: adjustedFractions }) });
  if (normalized.status === 'blocked' || adjustedFractions === undefined) return normalized;
  return { ...normalized, warnings: [...normalized.warnings, { code: 'LOAD_METER_YEN_ADJUSTED', message: 'The sourced hourly profile was adjusted to the declared YEn target using local weather data' }] };
}

function analyzeProjectSolar(input: ProjectInputsV1, normalization: Page1LoadNormalization | null, references?: Page1References): SolarResourceAnalysisEnvelopeV1 | null {
  const resource = input.site.solarResource;
  if (resource === null || resource.datasetOrDocument.trim().length === 0 || resource.versionOrDate.trim().length === 0 || resource.locator.trim().length === 0 || resource.retrievedAtIso.length === 0
    || resource.weatherFileId === undefined || resource.sourceSha256 === undefined || resource.timezoneOffsetMinutes === undefined || resource.albedo === undefined || resource.hourlyIrradiance === undefined
    || input.site.latitudeDeg === null || input.site.longitudeDeg === null || input.site.arrayTiltDeg === null || input.site.arrayAzimuthDeg === null) return null;
  const provenance: Provenance = { sourceId: resource.weatherFileId, sourceRecordId: resource.locator, sourceSha256: resource.sourceSha256, transformationVersion: '1.1.0' };
  const load = normalization?.status === 'ready' ? normalization.load : null;
  const peak = load === null ? null : deriveProjectPeakPower(input, load.hourlyEnergyWh, load.startupEvents);
  const analysis = analyzeSolarResource({
    latitudeDeg: input.site.latitudeDeg, longitudeDeg: input.site.longitudeDeg,
    surfaceTiltDeg: input.site.arrayTiltDeg, surfaceAzimuthDeg: input.site.arrayAzimuthDeg,
    albedo: resource.albedo, intervalMinutes: 60, timestampConvention: 'interval-center', timezoneOffsetMinutes: resource.timezoneOffsetMinutes,
    observations: resource.hourlyIrradiance,
    ...(load === null ? {} : { loadHourlyEnergyWh: load.hourlyEnergyWh }),
    ...(peak === null ? {} : { loadHourlyPeakPowerW: peak }),
    minimumOperationalIrradianceWm2: input.load.minimumOperatingIrradianceWPerM2 ?? 10,
    provenance,
  });
  if (references === undefined) return analysis;
  const annualGamma = annualGammaForProject(input, references, analysis.output.hourlyPoaWm2);
  return { ...analysis, output: { ...analysis.output, ...(annualGamma === null ? {} : { annualGamma }) } };
}

function annualGammaForProject(input: ProjectInputsV1, references: Page1References, hourlyPoaWm2: readonly number[]) {
  const resource = input.site.solarResource;
  const calendar = input.load.activeMode === 'composed' ? input.load.composed?.calendar : input.load.calendar;
  if (resource?.hourlyIrradiance === undefined || resource.hourlyIrradiance.length !== hourlyPoaWm2.length || input.site.timezoneIana === null || calendar === undefined) return null;
  const profiles: AnnualHourlyProfile[] = [];
  const sourceProfiles = input.load.activeMode === 'composed' && input.load.composed !== undefined && input.load.composed !== null
    ? input.load.composed.profiles.map((profile) => ({ ...profile, source: 'hourly' as const, items: [], meter: null }))
    : input.load.profiles;
  for (const profile of sourceProfiles) {
    let hourlyEnergyWh: readonly number[];
    if (profile.source === 'equipment') {
      const normalized = normalizeEquipmentRows({ timezoneIana: input.site.timezoneIana, rows: profile.items.map((item) => ({ id: item.id, label: item.label, quantity: item.quantity, usefulPowerW: item.usefulPowerW, efficiencyRatio: item.efficiencyRatio, simultaneityRatio: item.simultaneityRatio, hourlyOperatingFractions: item.hourlyOperatingFractions, startupPowerMultiplier: item.startupPowerMultiplier })) });
      if (normalized.status === 'blocked') continue;
      hourlyEnergyWh = normalized.load.hourlyEnergyWh;
    } else if (profile.source === 'hourly') {
      hourlyEnergyWh = profile.hourlyPoints.map((point) => point.activePowerW);
    } else {
      const normalized = normalizeMeterLoad(input, references, null);
      if (normalized.status === 'blocked') continue;
      hourlyEnergyWh = normalized.load.hourlyEnergyWh;
    }
    profiles.push({ id: profile.id, hourlyEnergyWh, hourlyPeakPowerW: profile.hourlyPoints.map((point) => point.peakPowerW ?? point.activePowerW) });
  }
  if (profiles.length === 0) return null;
  try {
    const weather = resource.hourlyIrradiance.map((point, index) => ({ timestampUtcIso: point.timestampUtcIso, poaWm2: hourlyPoaWm2[index]! }));
    const series = buildAnnualLoadSeries({ timezoneIana: input.site.timezoneIana, weather, calendar, profiles });
    return calculateAnnualYEn({ series, poaByTimestamp: new Map(weather.map((point) => [point.timestampUtcIso, point.poaWm2])), thresholdWm2: input.load.minimumOperatingIrradianceWPerM2 ?? 10 });
  } catch {
    return null;
  }
}

function deriveProjectPeakPower(input: ProjectInputsV1, hourlyMeanPowerW: readonly number[], startupEvents: readonly { readonly hourIndex: number; readonly runningPowerW: number; readonly startupPowerMultiplier: number | null }[]): number[] | null {
  if (input.load.activeMode === 'composed' && input.load.composed !== undefined && input.load.composed !== null) {
    const profileId = input.load.composed.calendar.assignments[0]?.profileId;
    const profile = input.load.composed.profiles.find((candidate) => candidate.id === profileId) ?? input.load.composed.profiles[0];
    return profile?.hourlyPoints.map((point, hour) => point.peakPowerW ?? hourlyMeanPowerW[hour]!) ?? null;
  }
  const profile = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId);
  if (profile === undefined) return null;
  return deriveHourlyPeakPower(profile.source, profile.hourlyPoints.map((point) => point.peakPowerW), hourlyMeanPowerW, startupEvents);
}

async function declaredProvenance(sourceId: string, sourceRecordId: string, value: unknown): Promise<Provenance> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sourceSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { sourceId, sourceRecordId, sourceSha256, transformationVersion: '1.0.0' };
}

function blocked(code: string, path: string, message: string): ProjectToAioResult {
  return { status: 'blocked', issues: [{ code, path, message }] };
}

function deriveHourlyPeakPower(
  source: 'equipment' | 'hourly' | 'meter',
  directPeaks: readonly (number | null)[],
  hourlyMeanPowerW: readonly number[],
  startupEvents: readonly { readonly hourIndex: number; readonly runningPowerW: number; readonly startupPowerMultiplier: number | null }[],
): number[] | null {
  if (source === 'meter') return null;
  if (source === 'hourly') return directPeaks.map((value, hour) => value ?? hourlyMeanPowerW[hour]!);
  const peaks = [...hourlyMeanPowerW];
  for (const event of startupEvents) {
    if (event.startupPowerMultiplier === null) continue;
    const increment = event.runningPowerW * (event.startupPowerMultiplier - 1);
    peaks[event.hourIndex] = peaks[event.hourIndex]! + increment;
  }
  return peaks;
}
