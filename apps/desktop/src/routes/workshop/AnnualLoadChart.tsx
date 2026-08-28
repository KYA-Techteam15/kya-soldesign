import { useMemo, useState } from 'react';
import type { AnnualLoadPresentation } from '../../app/models/annualLoadPresentation';
import { useT } from '../../i18n';

export function AnnualLoadChart({ presentation }: { readonly presentation: AnnualLoadPresentation | null }) {
  const t = useT();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const maximum = Math.max(...(presentation?.daily.map((point) => point.energyKwh) ?? [1]), 0.01);
  const selected = useMemo(() => presentation?.series.points.filter((point) => point.localDateIso === selectedDate) ?? [], [presentation, selectedDate]);
  if (!presentation) return <section className="out is-pending"><div className="tbl-title"><h2 className="h-sec">{t('loads.calendarAnnualTitle')}</h2><span className="label">{t('loads.calendarWaiting')}</span></div></section>;
  return <section className="annual-load-view">
    <div className="tbl-title"><h2 className="h-sec">{t('loads.calendarAnnualTitle')}</h2><span className="label">{t('loads.calendarWeightedYen')}</span><span className="sep" /><span className="metric-inline">{t('loads.yenLabel')} <b>{presentation.yEn.status === 'available' ? `${(presentation.yEn.annualGammaRatio * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %` : '—'}</b></span></div>
    <div className="annual-bars" role="img" aria-label={t('loads.calendarDailyEnergy')}>
      {presentation.daily.map((point) => <button key={point.dateIso} className="annual-bar" title={`${point.dateIso} · ${point.energyKwh.toFixed(2)} kWh`} aria-label={`Voir ${point.dateIso}`} onClick={() => setSelectedDate(point.dateIso)}><i style={{ height: `${Math.max(2, point.energyKwh / maximum * 100)}%` }} /><span /></button>)}
    </div>
    <div className="annual-chart-caption"><span>{presentation.daily[0]?.dateIso ?? '—'}</span><span>{t('loads.calendarClickDay')}</span><span>{presentation.daily.at(-1)?.dateIso ?? '—'}</span></div>
    {selectedDate && <div className="daily-detail"><div className="tbl-title"><h3 className="h-sec">{t('loads.calendarDayDetail')} {selectedDate}</h3><button className="btn btn-ghost" onClick={() => setSelectedDate(null)}>{t('loads.calendarClose')}</button></div><div className="hourgrid">{Array.from({ length: 24 }, (_, hour) => { const point = selected.find((candidate) => candidate.localHourIndex === hour); return <div key={hour}><span>{String(hour).padStart(2, '0')} h</span><b>{point ? `${point.activeEnergyWh.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} Wh` : '—'}</b></div>; })}</div></div>}
  </section>;
}
