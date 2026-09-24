import { useMemo, useState } from 'react';
import { saveFile } from '../../app/platform/files';
import type { AnnualLoadPresentationResult } from '../../app/models/annualLoadPresentation';
import { fill, useT } from '../../i18n';
import { fmt } from '../../domain/format';
import { LoadHeatmap, MONTH_KEYS } from './loads/LoadHeatmap';

type View = 'heatmap' | 'monthly' | 'day';

/**
 * Profil annuel de la source active, construit sur la météo du site. Trois lectures : la carte de
 * chaleur (jour × heure), l'énergie de chaque mois, et la journée moyenne. L'axe porte les mois,
 * jamais les années d'une année type météo, qui en mélange plusieurs.
 */
export function AnnualLoadChart({ result }: { readonly result: AnnualLoadPresentationResult }) {
  const t = useT();
  const [view, setView] = useState<View>('heatmap');
  const presentation = result.status === 'ready' ? result : null;

  const model = useMemo(() => {
    if (presentation === null) return null;
    const hourlyKw = presentation.series.points.map((point) => point.activeEnergyWh / 1000);
    const monthly = Array.from({ length: 12 }, () => 0);
    for (const day of presentation.daily) monthly[Number(day.dateIso.slice(5, 7)) - 1]! += day.energyKwh;
    const days = Math.max(1, Math.floor(hourlyKw.length / 24));
    const meanDay = Array.from({ length: 24 }, (_, hour) => {
      let sum = 0;
      for (let day = 0; day < days; day += 1) sum += hourlyKw[day * 24 + hour] ?? 0;
      return sum / days;
    });
    return { hourlyKw, monthly, meanDay, totalKwh: monthly.reduce((sum, value) => sum + value, 0) };
  }, [presentation]);

  if (result.status !== 'ready' || model === null) {
    return <section className="out is-pending"><div className="tbl-title"><h2 className="h-sec">{t('loads.calendarAnnualTitle')}</h2><span className="label">{result.status === 'ready' ? '' : t(result.reasonKey)}</span></div></section>;
  }

  const exportSeries = () => {
    const rows = [['date', 'hour', 'energy_kWh', 'peak_kW'], ...result.series.points.map((point) => [point.localDateIso.slice(5), String(point.localHourIndex).padStart(2, '0'), (point.activeEnergyWh / 1000).toFixed(4), (point.peakPowerW / 1000).toFixed(4)])];
    // BOM UTF-8 : Excel ouvre alors les accents correctement.
    void saveFile({ suggestedName: 'profil-annuel.csv', data: `﻿${rows.map((row) => row.join(';')).join('\n')}`, mimeType: 'text/csv;charset=utf-8', filter: { name: 'CSV', extensions: ['csv'] } });
  };

  const bars = view === 'monthly' ? model.monthly : model.meanDay;
  const barMax = Math.max(...bars, 0.001);

  return (
    <section className="annual-load-view">
      <div className="tbl-title">
        <h2 className="h-sec">{t('loads.calendarAnnualTitle')}</h2>
        <span className="label">{fill(t('loads.annualSummary'), { kwh: fmt(model.totalKwh, 0) })}</span>
        <span className="sep" />
        <span className="metric-inline" title={t('loads.calendarWeightedYen')}>{t('loads.yenLabel')} <b>{result.yEn.status === 'available' ? `${fmt(result.yEn.annualGammaRatio * 100, 1)} %` : '—'}</b></span>
      </div>
      <div className="annual-chart-controls">
        <div className="seg" role="tablist" aria-label={t('loads.chartView')}>
          {(['heatmap', 'monthly', 'day'] as const).map((key) => <button type="button" key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)}>{t(`loads.chartView.${key}`)}</button>)}
        </div>
        <span className="sep" />
        <button type="button" className="btn" onClick={exportSeries}>{t('loads.chartExport')}</button>
      </div>
      {view === 'heatmap' ? <LoadHeatmap hourlyKw={model.hourlyKw} label={t('loads.annualHeatmap')} /> : (
        <div className={`annual-bars-simple ${view}`} role="img" aria-label={t(`loads.chartView.${view}`)}>
          {bars.map((value, index) => (
            <span key={index} className="asb" title={view === 'monthly' ? `${t(MONTH_KEYS[index]!)} · ${fmt(value, 0)} kWh` : `${String(index).padStart(2, '0')} h · ${fmt(value, 2)} kW`}>
              <i style={{ height: `${Math.max(1, (value / barMax) * 100)}%` }} />
              <small>{view === 'monthly' ? t(MONTH_KEYS[index]!).slice(0, 3) : index % 3 === 0 ? String(index).padStart(2, '0') : ''}</small>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
