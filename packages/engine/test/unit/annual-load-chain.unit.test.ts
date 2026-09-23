import { describe, expect, it } from 'vitest';
import {
  PresizingEngine,
  FinanceEngine,
  designDayStartIndex,
  normalizeDirectHourlyRows,
  type FinanceInputV1,
  type PresizingInputV1,
} from '../../src/index.js';

/**
 * Chaîne annuelle.
 *
 * La charge a longtemps été une journée type répétée 365 fois : `[hour % 24]`
 * écrasait toute saisonnalité, et une pointe d'août ne se voyait nulle part.
 * Ces cas vérifient qu'une série de 8 760 valeurs traverse maintenant les deux
 * moteurs sans être moyennée, et que le chemin journalier n'a pas bougé.
 */

const hourlyPoaWm2 = Array.from({ length: 8_760 }, (_, hour) => {
  const localHour = hour % 24;
  return localHour >= 7 && localHour <= 17 ? 500 : 0;
});

/** Journée plate de 10 kWh. */
const flatDayWh = Array<number>(24).fill(10_000 / 24);

/**
 * Année de même énergie totale, mais concentrée : les trois mois d'été portent
 * le double, le reste de l'année la moitié. Une moyenne annuelle les confond ;
 * une simulation heure par heure ne le peut pas.
 */
const seasonalYearWh = Array.from({ length: 8_760 }, (_, hour) => {
  const day = Math.floor(hour / 24);
  const summer = day >= 150 && day < 240;
  return (10_000 / 24) * (summer ? 2 : 1 - (90 * 1) / (365 - 90));
});

const presizingBase: PresizingInputV1 = {
  dailyEnergyWh: 10_000, yEn: 0.5, hourlyLoadWh: flatDayWh, hourlyPoaWm2, peakPowerW: 1_000,
  lpspMax: 0.05, lolpMax: 0.05, systemPr: 0.8, inverterEfficiency: 0.95, batteryEfficiency: 0.9,
  pvSpecificCostPerKw: 300_000, batterySpecificCostPerKwh: 150_000, inverterSpecificCostPerKw: 100_000,
  gridTariffPerKwh: 150, emissionFactorKgPerKwh: 0.45, projectLifetimeYears: 20, pvLifetimeYears: 25,
  batteryLifetimeYears: 10, inverterLifetimeYears: 10,
  pvMaintenanceRatioPerYear: 0.01, batteryMaintenanceRatioPerYear: 0.02, inverterMaintenanceRatioPerYear: 0.01,
  discountRateRatio: 0.08,
};

const financeBase: FinanceInputV1 = {
  lines: [{ key: 'modules', label: 'Modules', quantity: 30, unitCost: 120_000, marginRatio: 0.15 }],
  vatRatio: 0.18, discountRatio: 0, downPaymentRatio: 0.4,
  pvPeakKw: 10, storageKwh: 20, inverterKw: 5,
  hourlyLoadKwh: flatDayWh.map((value) => value / 1_000), hourlyPoaWm2,
  systemPerformanceRatio: 0.8, inverterEfficiencyRatio: 0.95, batteryEfficiencyRatio: 0.9,
  projectLifetimeYears: 20, batteryLifetimeYears: 10, inverterLifetimeYears: 10,
  pvMaintenanceRatioPerYear: 0.01, batteryMaintenanceRatioPerYear: 0.02, inverterMaintenanceRatioPerYear: 0.01,
  discountRateRatio: 0.08, gridTariffPerKwh: 150, emissionFactorKgPerKwh: 0.45,
  selfConsumptionRatio: 0.9, dieselSpecificCostPerKw: 400_000,
};

describe('chaîne annuelle de la charge', () => {
  it('accepte 8 760 valeurs au prédimensionnement', async () => {
    const result = await new PresizingEngine().calculate({ ...presizingBase, hourlyLoadWh: seasonalYearWh });
    expect(result.output.selected.pvPeakKw).toBeGreaterThan(0);
    expect(result.output.selected.servedEnergyKwh).toBeGreaterThan(0);
  });

  it('refuse une série qui n’est ni une journée ni une année', async () => {
    await expect(new PresizingEngine().calculate({ ...presizingBase, hourlyLoadWh: Array<number>(168).fill(400) }))
      .rejects.toThrow('HOURLY_DATA_INCOMPLETE');
  });

  it('distingue une année saisonnière d’une journée plate de même énergie', async () => {
    const engine = new PresizingEngine();
    const flat = await engine.calculate(presizingBase);
    const seasonal = await engine.calculate({ ...presizingBase, hourlyLoadWh: seasonalYearWh });

    // Même besoin annuel à moins d'un pour cent près…
    const flatDemand = flatDayWh.reduce((total, value) => total + value, 0) * 365;
    const seasonalDemand = seasonalYearWh.reduce((total, value) => total + value, 0);
    expect(Math.abs(seasonalDemand / flatDemand - 1)).toBeLessThan(0.01);

    // …mais une concentration estivale que la moyenne annuelle ne voyait pas.
    // Le dimensionnement retenu ne peut donc pas être identique.
    expect(seasonal.output.selected.pvPeakKw).not.toBeCloseTo(flat.output.selected.pvPeakKw, 6);
  });

  it('laisse le chemin journalier strictement inchangé', async () => {
    // Une journée répétée 365 fois doit produire exactement ce qu'elle
    // produisait avant l'ouverture au 8 760.
    const engine = new PresizingEngine();
    const daily = await engine.calculate(presizingBase);
    const expanded = await engine.calculate({
      ...presizingBase,
      hourlyLoadWh: Array.from({ length: 8_760 }, (_, hour) => flatDayWh[hour % 24]!),
    });
    expect(expanded.output.selected.pvPeakKw).toBeCloseTo(daily.output.selected.pvPeakKw, 9);
    expect(expanded.output.selected.sri).toBeCloseTo(daily.output.selected.sri, 9);
  });

  it('accepte 8 760 valeurs au chiffrage et compte le besoin réel', () => {
    const engine = new FinanceEngine();
    const daily = engine.calculate(financeBase);
    const annual = engine.calculate({
      ...financeBase,
      hourlyLoadKwh: Array.from({ length: 8_760 }, (_, hour) => financeBase.hourlyLoadKwh[hour % 24]!),
    });
    // Le total de charge se lit désormais sur la boucle : les deux formes de
    // la même année doivent donner le même service rendu.
    expect(annual.output.simulation.servedEnergyKwh).toBeCloseTo(daily.output.simulation.servedEnergyKwh, 6);
    expect(annual.output.simulation.lpsp).toBeCloseTo(daily.output.simulation.lpsp, 9);
  });

  it('normalise une année directe sur sa journée la plus chargée', () => {
    const hourlyPowerW = Array.from({ length: 8_760 }, (_, hour) => {
      const day = Math.floor(hour / 24);
      return day === 200 ? 2_000 : 500;
    });
    const result = normalizeDirectHourlyRows({
      timezoneIana: 'Africa/Lome',
      hourlyPowerW,
      hourlyPeakPowerW: hourlyPowerW.map(() => null),
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    // La journée retenue est celle du 200e jour, pas une moyenne qui aurait
    // sous-dimensionné le système exactement le jour où il doit tenir.
    expect(result.load.hourlyEnergyWh.every((value) => Math.abs(value - 2_000) < 1e-6)).toBe(true);
    expect(result.warnings.some((warning) => warning.code === 'LOAD_DIRECT_ANNUAL_REDUCED_TO_DESIGN_DAY')).toBe(true);
  });

  it('désigne le même jour pour les moyennes et pour les pointes', () => {
    // Le jour 200 est le plus chargé. Les puissances moyennes et les pointes
    // sont deux vues de la même journée : si deux règles distinctes choisissent
    // deux jours différents, le rapport colle des pointes d'un jour sur les
    // moyennes d'un autre — sans que rien ne le signale.
    const hourlyPowerW = Array.from({ length: 8_760 }, (_, hour) => (Math.floor(hour / 24) === 200 ? 2_000 : 500));
    const start = designDayStartIndex(hourlyPowerW);
    expect(start).toBe(200 * 24);

    const normalized = normalizeDirectHourlyRows({
      timezoneIana: 'Africa/Lome',
      hourlyPowerW,
      hourlyPeakPowerW: hourlyPowerW.map(() => null),
    });
    expect(normalized.status).toBe('ready');
    if (normalized.status !== 'ready') return;
    // La journée retenue par la normalisation est bien celle que l'index nomme.
    expect(normalized.load.hourlyEnergyWh).toEqual(hourlyPowerW.slice(start, start + 24));
  });

  it('renvoie le premier jour pour une journée type', () => {
    expect(designDayStartIndex(Array<number>(24).fill(500))).toBe(0);
  });

  it('refuse une année dont les pointes n’ont pas la même longueur', () => {
    const result = normalizeDirectHourlyRows({
      timezoneIana: 'Africa/Lome',
      hourlyPowerW: Array<number>(8_760).fill(500),
      hourlyPeakPowerW: Array<number | null>(24).fill(600),
    });
    expect(result.status).toBe('blocked');
    if (result.status !== 'blocked') return;
    expect(result.issues.some((issue) => issue.code === 'LOAD_DIRECT_PEAK_LENGTH_INVALID')).toBe(true);
  });
});
