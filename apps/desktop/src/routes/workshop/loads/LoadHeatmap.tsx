import { useEffect, useRef } from 'react';
import { useT } from '../../../i18n';

const MONTH_STARTS = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
export const MONTH_KEYS = ['month.jan', 'month.feb', 'month.mar', 'month.apr', 'month.may', 'month.jun', 'month.jul', 'month.aug', 'month.sep', 'month.oct', 'month.nov', 'month.dec'] as const;

/**
 * Carte de chaleur d'une année horaire : une colonne par jour, une ligne par heure (00 en haut).
 * Plus la case est foncée, plus la puissance est forte. Les mois se lisent sous la carte ; aucune
 * année n'est affichée (une année type mélange des années différentes).
 */
export function LoadHeatmap({ hourlyKw, label }: { readonly hourlyKw: readonly number[]; readonly label: string }) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const days = Math.floor(hourlyKw.length / 24);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext('2d');
    if (!element || !context || days === 0) return;
    element.width = days;
    element.height = 24;
    const image = context.createImageData(days, 24);
    const max = Math.max(...hourlyKw, 0) || 1;
    for (let day = 0; day < days; day += 1) {
      for (let hour = 0; hour < 24; hour += 1) {
        const ratio = Math.min(1, (hourlyKw[day * 24 + hour] ?? 0) / max);
        const index = (hour * days + day) * 4;
        // Du fond clair (#eef2f6) à l'accent (#b8690e).
        image.data[index] = Math.round(238 + (184 - 238) * ratio);
        image.data[index + 1] = Math.round(242 + (105 - 242) * ratio);
        image.data[index + 2] = Math.round(246 + (14 - 246) * ratio);
        image.data[index + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
  }, [days, hourlyKw]);

  return (
    <figure className="heatmap">
      <div className="heatmap-body">
        <span className="heatmap-hours" aria-hidden="true"><span>00</span><span>06</span><span>12</span><span>18</span><span>23</span></span>
        <canvas ref={canvas} role="img" aria-label={label} />
      </div>
      <span className="heatmap-months" aria-hidden="true">
        {MONTH_STARTS.map((start, month) => <span key={start} style={{ left: `${(start / 365) * 100}%` }}>{t(MONTH_KEYS[month]!).slice(0, 3)}</span>)}
      </span>
    </figure>
  );
}
