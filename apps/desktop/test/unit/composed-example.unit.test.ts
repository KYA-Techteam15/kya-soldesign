import { describe, expect, it } from 'vitest';
import { validateAnnualCalendar, buildAnnualLoadSeries } from '@ksd/engine';
import { makeExampleComposition } from '../../src/routes/workshop/ComposedProfilesDialog.js';

/**
 * Le jeu d'essai des profils composés.
 *
 * Un exemple qui ne passe pas la validation est pire que pas d'exemple : il
 * apprend à l'utilisateur une forme invalide et lui fait perdre le temps qu'il
 * voulait gagner. Ces cas le vérifient comme une saisie réelle.
 */
describe('exemple de profils annuels composés', () => {
  const example = makeExampleComposition();

  it('produit un calendrier que le moteur accepte', () => {
    expect(validateAnnualCalendar(example.calendar)).toEqual([]);
  });

  it('couvre l’année entière, chaque jour une fois et une seule', () => {
    const weather = Array.from({ length: 8_760 }, (_, hour) => ({
      timestampUtcIso: new Date(Date.UTC(2021, 0, 1, hour)).toISOString(),
      poaWm2: hour % 24 >= 7 && hour % 24 <= 17 ? 400 : 0,
    }));
    const series = buildAnnualLoadSeries({
      timezoneIana: 'Africa/Lome', weather, calendar: example.calendar,
      profiles: example.profiles.map((profile) => ({
        id: profile.id,
        hourlyEnergyWh: profile.hourly.map((point) => point.realPower * 1_000),
        hourlyPeakPowerW: profile.hourly.map((point) => point.peakPower * 1_000),
      })),
    });
    // Aucune date sans profil : la construction aurait levé `CALENDAR_UNRESOLVED`.
    expect(series.points).toHaveLength(8_760);
    // Les quatre profils servent réellement — un exemple à quatre entrées dont
    // deux ne sortent jamais n'enseignerait rien.
    expect(new Set(series.points.map((point) => point.profileId)).size).toBe(4);
  });

  it('décrit des saisons réellement différentes', () => {
    const energyOf = (id: string) => example.profiles.find((profile) => profile.id === id)!
      .hourly.reduce((total, point) => total + point.realPower, 0);
    // La saison chaude consomme plus que la tempérée, et le week-end moins que
    // la semaine : sans cela l'exemple n'illustrerait aucune modulation.
    expect(energyOf('example-hot-week')).toBeGreaterThan(energyOf('example-mild-week'));
    expect(energyOf('example-hot-weekend')).toBeLessThan(energyOf('example-hot-week'));
    expect(energyOf('example-mild-weekend')).toBeLessThan(energyOf('example-mild-week'));
  });

  it('garde une pointe au moins égale à la puissance moyenne', () => {
    for (const profile of example.profiles) {
      for (const point of profile.hourly) {
        expect(point.peakPower).toBeGreaterThanOrEqual(point.realPower);
      }
    }
  });
});
