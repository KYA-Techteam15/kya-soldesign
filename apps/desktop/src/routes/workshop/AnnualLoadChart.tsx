import { useMemo, useState } from 'react';
import { queryAnnualChart, reduceAnnualChartPoints, type AnnualChartFrequency, type AnnualChartRange } from '@ksd/engine';
import type { AnnualLoadPresentation } from '../../app/models/annualLoadPresentation';
import { useT } from '../../i18n';

export function AnnualLoadChart({ presentation }: { readonly presentation: AnnualLoadPresentation | null }) {
  const t = useT();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [range, setRange] = useState<AnnualChartRange>('year');
  const [frequency, setFrequency] = useState<AnnualChartFrequency>('auto');
  const [periodId, setPeriodId] = useState('');
  const [month, setMonth] = useState(1);
  const [anchorDateIso, setAnchorDateIso] = useState('');
  const [startDateIso, setStartDateIso] = useState('');
  const [endDateIso, setEndDateIso] = useState('');
  const [displayLimit, setDisplayLimit] = useState(600);
  const [displayOffset, setDisplayOffset] = useState(0);
  const firstDate = presentation?.series.points[0]?.localDateIso ?? '2021-01-01';
  const lastDate = presentation?.series.points.at(-1)?.localDateIso ?? '2021-12-31';
  const effectiveAnchorDate = anchorDateIso || firstDate;
  const effectiveStartDate = startDateIso || firstDate;
  const effectiveEndDate = endDateIso || lastDate;
  const chart = useMemo(() => presentation === null ? null : queryAnnualChart({
    series: presentation.series,
    poaByTimestamp: presentation.poaByTimestamp,
    query: { range, frequency, ...(periodId ? { periodId } : {}), ...(range === 'month' ? { month } : {}), ...(['week', 'day'].includes(range) ? { anchorDateIso: effectiveAnchorDate } : {}), ...(range === 'custom-range' ? { startDateIso: effectiveStartDate, endDateIso: effectiveEndDate } : {}) },
  }), [effectiveAnchorDate, effectiveEndDate, effectiveStartDate, frequency, month, periodId, presentation, range]);
  const chartWindow = useMemo(() => chart === null ? [] : chart.points.slice(displayOffset, displayOffset + displayLimit), [chart, displayLimit, displayOffset]);
  const visiblePoints = useMemo(() => reduceAnnualChartPoints(chartWindow), [chartWindow]);
  const maximum = Math.max(...visiblePoints.map((point) => point.energyWh), 0.01);
  const selected = useMemo(() => presentation?.series.points.filter((point) => point.localDateIso === selectedDate) ?? [], [presentation, selectedDate]);
  if (!presentation) return <section className="out is-pending"><div className="tbl-title"><h2 className="h-sec">{t('loads.calendarAnnualTitle')}</h2><span className="label">{t('loads.calendarWaiting')}</span></div></section>;
  const exportChart = () => {
    if (chart === null) return;
    const rows = [['bucket', 'start_date', 'end_date', 'energy_Wh', 'average_power_W', 'peak_power_W', 'mean_poa_Wm2'], ...chart.points.map((point) => [point.bucket, point.startDateIso, point.endDateIso, point.energyWh.toFixed(3), point.averagePowerW.toFixed(3), point.peakPowerW.toFixed(3), point.meanPoaWm2?.toFixed(3) ?? ''])];
    const blob = new Blob([rows.map((row) => row.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `profil-annuel-${chart.frequency}.csv`; link.click(); URL.revokeObjectURL(link.href);
  };
  const canNavigate = chart !== null && chart.points.length > displayLimit;
  return <section className="annual-load-view">
    <div className="tbl-title"><h2 className="h-sec">{t('loads.calendarAnnualTitle')}</h2><span className="label">{t('loads.calendarWeightedYen')}</span><span className="sep" /><span className="metric-inline">{t('loads.yenLabel')} <b>{presentation.yEn.status === 'available' ? `${(presentation.yEn.annualGammaRatio * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %` : '—'}</b></span></div>
    <div className="annual-chart-controls" aria-label="Options du tracé annuel">
      <label><span>{t('loads.chartView')}</span><select value={range} onChange={(event) => setRange(event.target.value as AnnualChartRange)}><option value="year">{t('loads.chartYear')}</option><option value="period">{t('loads.chartPeriod')}</option><option value="month">{t('loads.chartMonth')}</option><option value="week">{t('loads.chartWeek')}</option><option value="day">{t('loads.chartDay')}</option><option value="custom-range">{t('loads.chartCustom')}</option></select></label>
      {range === 'period' && <label><span>{t('loads.chartPeriod')}</span><select value={periodId} onChange={(event) => setPeriodId(event.target.value)}><option value="">{t('loads.chartAllPeriods')}</option>{presentation.periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>}
      {range === 'month' && <label><span>{t('loads.chartMonth')}</span><select value={month} onChange={(event) => setMonth(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}</select></label>}
      {(['week', 'day'].includes(range)) && <label><span>{t('loads.chartAnchor')}</span><input type="date" value={effectiveAnchorDate} onChange={(event) => setAnchorDateIso(event.target.value)} /></label>}
      {range === 'custom-range' && <><label><span>{t('loads.chartStart')}</span><input type="date" value={effectiveStartDate} onChange={(event) => setStartDateIso(event.target.value)} /></label><label><span>{t('loads.chartEnd')}</span><input type="date" value={effectiveEndDate} onChange={(event) => setEndDateIso(event.target.value)} /></label></>}
      <label><span>{t('loads.chartFrequency')}</span><select value={frequency} onChange={(event) => setFrequency(event.target.value as AnnualChartFrequency)}><option value="auto">{t('loads.chartAutomatic')}</option><option value="hourly">{t('loads.chartHourly')}</option><option value="daily">{t('loads.chartDaily')}</option><option value="weekly">{t('loads.chartWeekly')}</option><option value="monthly">{t('loads.chartMonthly')}</option></select></label>
      <button className="btn" onClick={exportChart}>{t('loads.chartExport')}</button>
      {canNavigate && <><button className="btn" aria-label={t('loads.chartZoomOut')} onClick={() => { setDisplayLimit((value) => Math.min(chart?.points.length ?? value, value * 2)); setDisplayOffset(0); }}>{t('loads.chartZoomOut')}</button><button className="btn" aria-label={t('loads.chartZoomIn')} onClick={() => setDisplayLimit((value) => Math.max(24, Math.floor(value / 2)))}>{t('loads.chartZoomIn')}</button><button className="btn" disabled={displayOffset <= 0} onClick={() => setDisplayOffset((value) => Math.max(0, value - displayLimit))}>{t('loads.chartPrevious')}</button><button className="btn" disabled={displayOffset + displayLimit >= (chart?.points.length ?? 0)} onClick={() => setDisplayOffset((value) => Math.min((chart?.points.length ?? 0) - displayLimit, value + displayLimit))}>{t('loads.chartNext')}</button></>}
    </div>
    <div className="annual-bars" role="img" aria-label={`${t('loads.calendarDailyEnergy')} · ${chart?.frequency ?? '—'}`}>
      {visiblePoints.map((point) => <button key={point.bucket} className="annual-bar" title={`${point.bucket} · ${(point.energyWh / 1000).toFixed(2)} kWh`} aria-label={`Voir ${point.startDateIso}`} onClick={() => setSelectedDate(point.startDateIso)}><i style={{ height: `${Math.max(2, point.energyWh / maximum * 100)}%` }} /><span /></button>)}
    </div>
    <div className="annual-chart-caption"><span>{chart?.points[0]?.startDateIso ?? '—'}</span><span>{chart?.points.length ?? 0} points · {chart?.frequency ?? '—'} · cliquer pour le détail</span><span>{chart?.points.at(-1)?.endDateIso ?? '—'}</span></div>
    {selectedDate && <div className="daily-detail"><div className="tbl-title"><h3 className="h-sec">{t('loads.calendarDayDetail')} {selectedDate}</h3><button className="btn btn-ghost" onClick={() => setSelectedDate(null)}>{t('loads.calendarClose')}</button></div><div className="hourgrid">{Array.from({ length: 24 }, (_, hour) => { const point = selected.find((candidate) => candidate.localHourIndex === hour); return <div key={hour}><span>{String(hour).padStart(2, '0')} h</span><b>{point ? `${point.activeEnergyWh.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Wh` : '—'}</b></div>; })}</div></div>}
  </section>;
}
