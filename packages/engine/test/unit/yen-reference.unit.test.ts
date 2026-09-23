import { describe, expect, it } from 'vitest';
import { buildAnnualLoadSeries, calculateAnnualYEn } from '../../src/index.js';

/** yEn de référence : somme de la charge des heures favorables / charge totale. */
const referenceYEn = (loadWh: number[], poa: number[], threshold: number) => {
  let fav = 0, tot = 0;
  for (let h = 0; h < loadWh.length; h += 1) { tot += loadWh[h]!; if (poa[h]! >= threshold) fav += loadWh[h]!; }
  return fav / tot;
};

describe('équivalence des deux formules de yEn', () => {
  it('donne le même nombre que la formule directe, sur une charge annuelle', () => {
    // Charge irrégulière : saisonnalité + creux week-end, pour qu'un
    // regroupement par période/type de jour ne puisse pas se confondre par
    // hasard avec la moyenne directe.
    const loadWh = Array.from({ length: 8760 }, (_, h) => {
      const day = Math.floor(h / 24), hour = h % 24;
      const season = 1 + 0.6 * Math.sin((day / 365) * 2 * Math.PI);
      const weekend = (day + 4) % 7 >= 5 ? 0.4 : 1;
      const shape = hour >= 7 && hour < 19 ? 3 : 1;
      return 1000 * season * weekend * shape;
    });
    const poa = Array.from({ length: 8760 }, (_, h) => {
      const hour = h % 24;
      return hour >= 7 && hour <= 17 ? 120 + 60 * Math.sin(((hour - 7) / 10) * Math.PI) : 0;
    });
    const start = Date.UTC(2021, 0, 1);
    const weather = poa.map((poaWm2, h) => ({ timestampUtcIso: new Date(start + h * 3_600_000).toISOString(), poaWm2 }));

    const series = buildAnnualLoadSeries({
      timezoneIana: 'UTC', weather,
      calendar: {
        version: 2, mode: 'annual',
        dayGroups: [{ id: 'all-days', kind: 'all-days', weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }],
        periods: [{ id: 'annual', name: 'Année', startMonthDay: '01-01', endMonthDay: '12-31' }],
        assignments: [{ periodId: 'annual', dayGroupId: 'all-days', profileId: 'p' }],
      },
      profiles: [{ id: 'p', hourlyEnergyWh: loadWh }],
    });
    const poaByTimestamp = new Map(weather.map((w) => [w.timestampUtcIso, w.poaWm2]));
    const mine = calculateAnnualYEn({ series, poaByTimestamp, thresholdWm2: 10 });

    expect(mine.status).toBe('available');
    if (mine.status !== 'available') return;
    const reference = referenceYEn(loadWh, poa, 10);
    console.log('  application :', mine.annualGammaRatio.toFixed(9));
    console.log('  référence   :', reference.toFixed(9));
    expect(mine.annualGammaRatio).toBeCloseTo(reference, 9);
  });
});

describe('année type PVGIS et ordre du tracé', () => {
  it('suit la succession des saisons, pas celle des années sources', async () => {
    const { queryAnnualChart } = await import('../../src/index.js');
    // Une année type emprunte chaque mois à une année réelle différente :
    // ici janvier vient de 2022 et décembre de 2005. Le fichier reste rangé
    // de janvier à décembre ; le tracé doit en faire autant.
    const years = [2022, 2015, 2012, 2011, 2018, 2009, 2017, 2007, 2019, 2014, 2010, 2005];
    const weather: { timestampUtcIso: string; poaWm2: number }[] = [];
    for (let month = 0; month < 12; month += 1) {
      const days = new Date(Date.UTC(2021, month + 1, 0)).getUTCDate();
      for (let day = 1; day <= days; day += 1) {
        for (let hour = 0; hour < 24; hour += 1) {
          weather.push({
            timestampUtcIso: new Date(Date.UTC(years[month]!, month, day, hour)).toISOString(),
            poaWm2: hour >= 7 && hour <= 17 ? 400 : 0,
          });
        }
      }
    }
    const series = buildAnnualLoadSeries({
      timezoneIana: 'UTC', weather,
      calendar: {
        version: 2, mode: 'annual',
        dayGroups: [{ id: 'all-days', kind: 'all-days', weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }],
        periods: [{ id: 'annual', name: 'Année', startMonthDay: '01-01', endMonthDay: '12-31' }],
        assignments: [{ periodId: 'annual', dayGroupId: 'all-days', profileId: 'p' }],
      },
      profiles: [{ id: 'p', hourlyEnergyWh: Array<number>(24).fill(1_000) }],
    });

    const chart = queryAnnualChart({ series, query: { range: 'year', frequency: 'monthly' } });
    expect(chart.points).toHaveLength(12);
    // Les mois se suivent de 01 à 12, quelle que soit leur année d'origine.
    expect(chart.points.map((point) => point.bucket.slice(5, 7)))
      .toEqual(['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']);
    // Et l'axe commence bien en janvier, non au mois dont l'année est la plus ancienne.
    expect(chart.points[0]!.startDateIso.slice(5)).toBe('01-01');
  });
});
