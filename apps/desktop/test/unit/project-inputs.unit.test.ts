import { describe, expect, it } from 'vitest';
import { projectInputsV1Schema } from '../../src/app/models/projectInputs.js';

const hourlyPoints = Array.from({ length: 24 }, (_, hourIndex) => ({
  hourIndex,
  activePowerW: 0,
  peakPowerW: null,
}));

const validInput = {
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
      source: 'equipment', items: [], hourlyPoints, meter: null,
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
} as const;

describe('ProjectInputsV1', () => {
  it('accepts an explicit unknown-safe draft', () => {
    expect(projectInputsV1Schema.parse(validInput).site.latitudeDeg).toBeNull();
  });

  it('rejects unknown fields and broken profile references', () => {
    expect(projectInputsV1Schema.safeParse({ ...validInput, guessedPowerW: 0 }).success).toBe(false);
    expect(projectInputsV1Schema.safeParse({
      ...validInput,
      load: { ...validInput.load, activeProfileId: 'missing' },
    }).success).toBe(false);
  });

  it('rejects implicit units and invalid ranges', () => {
    expect(projectInputsV1Schema.safeParse({
      ...validInput,
      site: { ...validInput.site, latitudeDeg: 91 },
    }).success).toBe(false);
    expect(projectInputsV1Schema.safeParse({
      ...validInput,
      assumptions: { ...validInput.assumptions, maxLpspRatio: 5 },
    }).success).toBe(false);
  });
});
