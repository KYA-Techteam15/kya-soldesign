import { describe, expect, it } from 'vitest';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { buildReportLoadSummary } from '../../src/app/export/reportLoadSummary.js';
import type { ProjectViewModel } from '../../src/app/models/projectView.js';

/**
 * Le rapport a longtemps recalculé la charge pour son propre compte. Il
 * annonçait alors des chiffres que le moteur n'avait jamais vus, et laissait
 * la table vide dès qu'on ne saisissait pas d'appareils. Ces trois cas
 * verrouillent le contraire.
 */

const dayHours = (value: number) => Array.from({ length: 24 }, () => value);

/** Journée : 500 W de 08 h à 17 h, rien le reste du temps. */
const workday = Array.from({ length: 24 }, (_, hour) => (hour >= 8 && hour < 18 ? 1 : 0));

function projectWith(load: Partial<ProjectViewModel['load']>): ProjectViewModel {
  return {
    load: {
      granularity: 'annual',
      activeMode: 'simple',
      composition: null,
      calendar: { version: 2, mode: 'annual', dayGroups: [], periods: [], assignments: [] },
      profiles: [],
      activeProfileId: 'p',
      irMin: 10,
      ...load,
    },
  } as unknown as ProjectViewModel;
}

function profile(overrides: Record<string, unknown>) {
  return {
    id: 'p', name: 'Base', color: '#000', source: 'equipments',
    appliances: [], hourly: [], meter: null,
    ...overrides,
  };
}

const solar = (hourlyEnergyWh: readonly number[], hourlyPeakPowerW: readonly number[] | null): SolarResourceAnalysisOutputV1 => ({
  hourlyPoaWm2: [], monthlyAverageDailyPoaKWhM2Day: [], meanHourlyPoaWm2: [],
  monthlyMeanHourlyPoaWm2: [], annualPoaKWhM2: 0, designMonth: null,
  gamma: { status: 'unavailable', reasonCode: 'LOAD_PROFILE_MISSING' },
  albedo: 0.2, loadHourlyEnergyWh: hourlyEnergyWh, loadHourlyPeakPowerW: hourlyPeakPowerW,
});

describe('synthèse des besoins pour les documents', () => {
  it('reporte les totaux du moteur même sans détail appareil par appareil', () => {
    // Profil horaire saisi : aucune ligne d'inventaire n'existe, mais le
    // dimensionnement s'est bien appuyé sur une consommation réelle.
    const project = projectWith({
      profiles: [profile({ source: 'hourly', hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, realPower: 1, peakPower: 2 })) })] as never,
    });
    const summary = buildReportLoadSummary(project, solar(dayHours(1_000), dayHours(2_000)));

    expect(summary.origin).toBe('hourly');
    expect(summary.rows).toHaveLength(0);
    expect(summary.dailyEnergyWh).toBe(24_000);
    expect(summary.peakPowerW).toBe(2_000);
    expect(summary.fromEngine).toBe(true);
  });

  it('applique la règle du moteur — le rendement divise, il ne multiplie pas', () => {
    const project = projectWith({
      profiles: [profile({
        appliances: [{ id: 'c1', name: 'Éclairage', qty: 2, unitPower: 500, yield: 0.85, operatingFractions: workday, opHours: 10, startupCoef: 1, inductive: false }],
      })] as never,
    });
    const summary = buildReportLoadSummary(project, null);

    // 2 × 500 W ÷ 0,85 = 1176,47 W appelés, et non 2 × 500 × 0,85 = 850 W.
    expect(summary.rows[0]!.calledPowerW).toBeCloseTo(1_176.47, 2);
    // 10 heures de fonctionnement issues des fractions horaires.
    expect(summary.rows[0]!.dailyEnergyWh).toBeCloseTo(11_764.71, 2);
  });

  it('n’ampute aucune ligne au-delà de la douzième', () => {
    const project = projectWith({
      profiles: [profile({
        appliances: Array.from({ length: 18 }, (_, index) => ({
          id: `c${index}`, name: `Poste ${index}`, qty: 1, unitPower: 100,
          yield: 1, operatingFractions: workday, opHours: 10, startupCoef: 1, inductive: false,
        })),
      })] as never,
    });
    const summary = buildReportLoadSummary(project, null);

    expect(summary.rows).toHaveLength(18);
    // Le total doit correspondre au détail imprimé, pas à un sur-ensemble.
    expect(summary.totalQuantity).toBe(18);
    expect(summary.calledPowerW).toBeCloseTo(1_800, 6);
  });

  it('nomme la source composée sans prétendre à un détail qu’elle n’a pas', () => {
    const project = projectWith({
      activeMode: 'composed',
      composition: { organization: 'periods', profiles: [], calendar: { version: 2, mode: 'periods', dayGroups: [], periods: [], assignments: [] } } as never,
      profiles: [profile({})] as never,
    });
    const summary = buildReportLoadSummary(project, solar(dayHours(250), null));

    expect(summary.origin).toBe('composed');
    expect(summary.originKey).toBe('report.loadOrigin.composed');
    expect(summary.rows).toHaveLength(0);
    // Sans série de pointes, la pointe retombe sur le maximum horaire connu.
    expect(summary.peakPowerW).toBe(250);
  });
});
