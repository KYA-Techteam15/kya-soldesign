import { useRef, useState } from 'react';
import { HOURS } from '../../../app/models/operatingHours';
import { fmt } from '../../../domain/format';
import { fill, useT } from '../../../i18n';
import { DraftNumberInput } from './DraftNumberInput';

type Point = { hour: number; realPower: number; peakPower: number | null };

const W = 720;
const H = 150;
const PAD_L = 36;
const PAD_B = 18;
const PAD_T = 8;
const BLOCK_STARTS = [0, 6, 12, 18] as const;

/**
 * Journée type en kW : un histogramme qu'on règle à la souris et un tableau Moyenne / Pointe.
 * Une pointe vide vaut la moyenne (« = ») : on ne saisit que les heures où elle diffère.
 * Une ou deux lignes de 24 valeurs collées depuis un tableur remplissent le tableau.
 */
export function TypicalDayEditor({ hourly, mutate }: {
  readonly hourly: readonly Point[];
  readonly mutate: (change: (points: Point[]) => void) => void;
}) {
  const t = useT();
  const drag = useRef<{ top: number } | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const means = HOURS.map((hour) => hourly[hour]?.realPower ?? 0);
  const peaks = HOURS.map((hour) => hourly[hour]?.peakPower ?? means[hour]!);
  const scaleTop = niceTop(Math.max(...peaks, ...means, 0.5));
  const plotW = W - PAD_L - 8;
  const plotH = H - PAD_T - PAD_B;
  const slot = plotW / 24;
  const y = (value: number, top: number) => PAD_T + plotH - (value / top) * plotH;

  const setMean = (hour: number, value: number) => mutate((points) => {
    const point = points[hour];
    if (!point) return;
    point.realPower = Math.max(0, round2(value));
    if (point.peakPower !== null && point.peakPower < point.realPower) point.peakPower = point.realPower;
  });
  const setPeak = (hour: number, value: number | null) => mutate((points) => {
    const point = points[hour];
    if (!point) return;
    point.peakPower = value === null || value <= point.realPower ? null : round2(value);
  });

  const fromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * W;
    const yy = ((event.clientY - box.top) / box.height) * H;
    const hour = Math.min(23, Math.max(0, Math.floor((x - PAD_L) / slot)));
    const top = drag.current?.top ?? scaleTop;
    return { hour, value: Math.max(0, ((PAD_T + plotH - yy) / plotH) * top) };
  };

  const paste = (event: React.ClipboardEvent) => {
    const rows = event.clipboardData.getData('text/plain').trim().split(/\r?\n/u).map((line) => line.split(/[\t;]/u).map((value) => Number(value.trim().replace(',', '.'))));
    let meanRow: number[] | null = null;
    let peakRow: number[] | null = null;
    if (rows.length <= 2 && rows[0]?.length === 24) { meanRow = rows[0]!; peakRow = rows[1] ?? null; }
    else if (rows.length === 24 && rows.every((row) => row.length >= 1)) { meanRow = rows.map((row) => row[0]!); peakRow = rows.every((row) => row.length >= 2) ? rows.map((row) => row[1]!) : null; }
    if (meanRow === null || meanRow.some((value) => !Number.isFinite(value) || value < 0)) return;
    event.preventDefault();
    mutate((points) => points.forEach((point, hour) => {
      point.realPower = round2(meanRow![hour]!);
      const peak = peakRow?.[hour];
      point.peakPower = peak !== undefined && Number.isFinite(peak) && peak > point.realPower ? round2(peak) : null;
    }));
  };

  const totalKwh = means.reduce((sum, value) => sum + value, 0);
  const peakKw = Math.max(...peaks, 0);
  const peakHour = peaks.indexOf(peakKw);

  return (
    <div className="dayprofile">
      <svg viewBox={`0 0 ${W} ${H}`} className="dayprofile-plot" role="img" aria-label={t('loads.typicalDayChart')}
        onPointerDown={(event) => { if (event.button !== 0) return; event.currentTarget.setPointerCapture(event.pointerId); drag.current = { top: scaleTop }; const { hour, value } = fromPointer(event); setMean(hour, value); }}
        onPointerMove={(event) => { const { hour, value } = fromPointer(event); setHover(hour); if (drag.current) setMean(hour, value); }}
        onPointerUp={() => { drag.current = null; }}
        onPointerLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line x1={PAD_L} x2={W - 8} y1={y(scaleTop * ratio, scaleTop)} y2={y(scaleTop * ratio, scaleTop)} className="dp-grid" />
            <text x={PAD_L - 4} y={y(scaleTop * ratio, scaleTop) + 3} className="dp-tick">{fmt(scaleTop * ratio, scaleTop < 2 ? 1 : 0)}</text>
          </g>
        ))}
        {HOURS.map((hour) => (
          <g key={hour}>
            <rect x={PAD_L + hour * slot + slot * 0.18} width={slot * 0.64} y={y(peaks[hour]!, scaleTop)} height={Math.max(0, PAD_T + plotH - y(peaks[hour]!, scaleTop))} className="dp-peak" />
            <rect x={PAD_L + hour * slot + slot * 0.18} width={slot * 0.64} y={y(means[hour]!, scaleTop)} height={Math.max(0, PAD_T + plotH - y(means[hour]!, scaleTop))} className={`dp-mean ${hover === hour ? 'is-hover' : ''}`} />
            {hour % 2 === 0 && <text x={PAD_L + hour * slot + slot / 2} y={H - 4} className="dp-tick t-hour">{String(hour).padStart(2, '0')}</text>}
          </g>
        ))}
      </svg>
      <p className="label dayprofile-hint">{t('loads.typicalDayHint')}</p>
      {/* Quatre blocs de six heures : des champs assez larges pour lire la valeur entière, sans
          défilement horizontal. Le collage depuis un tableur vaut pour les quatre blocs. */}
      <div className="dayprofile-grid" onPaste={paste}>
        {BLOCK_STARTS.map((start) => (
          <table key={start} className="tbl t-dayprofile">
            <thead>
              <tr>
                <th>{t('loads.hourShort')}</th>
                <th>{t('loads.meanShort')} <span className="unit">kW</span></th>
                <th>{t('loads.peakShort')} <span className="unit">kW</span></th>
              </tr>
            </thead>
            <tbody>
              {HOURS.slice(start, start + 6).map((hour) => (
                <tr key={hour} className={hover === hour ? 'is-hover' : undefined}>
                  <th scope="row">{String(hour).padStart(2, '0')}</th>
                  <td>
                    <DraftNumberInput className="cell-in" aria-label={fill(t('loads2.powerAtHour'), { hour })} value={means[hour]!} format={(value) => fmt(value, 2)}
                      onCommit={(value) => { if (value !== null) setMean(hour, value); }} />
                  </td>
                  <td>
                    <DraftNumberInput className="cell-in" nullable placeholder="=" aria-label={fill(t('loads2.peakAtHour'), { hour })} value={hourly[hour]?.peakPower ?? null} format={(value) => fmt(value, 2)}
                      onCommit={(value) => setPeak(hour, value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
      <p className="label">
        {fill(t('loads.typicalDayTotals'), { kwh: fmt(totalKwh, 2), kw: fmt(peakKw, 2), hour: String(Math.max(0, peakHour)).padStart(2, '0') })}
        {' · '}{t('loads.peakEqualsMean')}
      </p>
    </div>
  );
}

function niceTop(value: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  return (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
}

const round2 = (value: number) => Math.round(value * 100) / 100;
