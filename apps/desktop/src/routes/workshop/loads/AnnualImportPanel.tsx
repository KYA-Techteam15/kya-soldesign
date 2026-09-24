import { fmt } from '../../../domain/format';
import { fill, useT } from '../../../i18n';
import { useUi } from '../../../store/ui';
import { LoadHeatmap, MONTH_KEYS } from './LoadHeatmap';

type Point = { readonly hour: number; readonly realPower: number; readonly peakPower: number | null };

const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/** Jour et mois (sans année) de l'heure `index` d'une année de 365 jours. */
function dayLabel(dayIndex: number, t: (key: string) => string): string {
  let month = 11;
  while (month > 0 && DAYS_BEFORE_MONTH[month]! > dayIndex) month -= 1;
  return `${dayIndex - DAYS_BEFORE_MONTH[month]! + 1} ${t(MONTH_KEYS[month]!).toLowerCase()}`;
}

/**
 * Année importée : ce que contient la série, en une carte de chaleur et quatre chiffres. On ne
 * montre pas 8 760 champs ; on dit le total, la pointe, et le jour qui dimensionne.
 */
export function AnnualImportPanel({ annual, sourceName, onImport, onRemove }: {
  readonly annual: readonly Point[] | null;
  readonly sourceName: string | null;
  readonly onImport: () => void;
  readonly onRemove: () => void;
}) {
  const t = useT();
  const ask = useUi((state) => state.ask);
  if (annual === null) {
    return (
      <div className="empty source-empty">
        <b>{t('loads.annualEmptyTitle')}</b>
        <span>{t('loads.annualEmptyBody')}</span>
        <button type="button" className="btn btn-primary" onClick={onImport}>{t('loads.annualImport')}</button>
      </div>
    );
  }
  const means = annual.map((point) => point.realPower);
  const totalKwh = means.reduce((sum, value) => sum + value, 0);
  const peaks = annual.map((point) => point.peakPower ?? point.realPower);
  const peakKw = Math.max(...peaks, 0);
  const peakIndex = peaks.indexOf(peakKw);
  let designDay = 0;
  let designDayKwh = -1;
  for (let day = 0; day * 24 + 24 <= means.length; day += 1) {
    const energy = means.slice(day * 24, day * 24 + 24).reduce((sum, value) => sum + value, 0);
    if (energy > designDayKwh) { designDayKwh = energy; designDay = day; }
  }

  return (
    <div className="annual-import">
      <div className="annual-import-head">
        <span className="label">{sourceName ?? t('loads.annualImported')} · {fmt(annual.length, 0)} h · {t('loads.annualChecked')}</span>
        <span className="sep" />
        <button type="button" className="btn" onClick={onImport}>{t('loads.annualReplace')}</button>
        <button type="button" className="btn btn-ghost" onClick={() => ask({ title: t('loads.annualRemoveTitle'), message: t('loads.annualRemoveBody'), confirmLabel: t('loads.annualRemove'), danger: true, onConfirm: onRemove })}>{t('loads.annualRemove')}</button>
      </div>
      <LoadHeatmap hourlyKw={means} label={t('loads.annualHeatmap')} />
      <div className="out-grid">
        <div className="out-cell is-lead"><span className="out-lbl">{t('loads.annualTotal')}</span><span className="out-val"><b>{fmt(totalKwh, 0)}</b><span className="unit">{t('loads2.kwhAn')}</span></span></div>
        <div className="out-cell"><span className="out-lbl">{t('loads.annualPeak')}</span><span className="out-val"><b>{fmt(peakKw, 2)}</b><span className="unit">kW</span></span><span className="out-note">{fill(t('loads.annualPeakWhen'), { day: dayLabel(Math.floor(peakIndex / 24), t), hour: String(peakIndex % 24).padStart(2, '0') })}</span></div>
        <div className="out-cell"><span className="out-lbl">{t('loads.annualDesignDay')}</span><span className="out-val"><b>{dayLabel(designDay, t)}</b></span><span className="out-note">{fmt(designDayKwh, 1)} kWh</span></div>
        <div className="out-cell"><span className="out-lbl">{t('loads.annualMeanDay')}</span><span className="out-val"><b>{fmt(totalKwh / Math.max(1, Math.floor(means.length / 24)), 1)}</b><span className="unit">kWh/j</span></span></div>
      </div>
      <p className="label">{t('loads.annualHint')}</p>
    </div>
  );
}
