import { HOURS } from '../../../app/models/operatingHours';

/** Frise des 24 heures d'un appareil, en lecture : une case pleine par heure de fonctionnement. */
export function HoursStrip({ fractions }: { readonly fractions: readonly number[] }) {
  return (
    <span className="hstrip" aria-hidden="true">
      {HOURS.map((hour) => {
        const value = fractions[hour] ?? 0;
        return <span key={hour} className={value >= 1 ? 'on' : value > 0 ? 'part' : ''} />;
      })}
    </span>
  );
}

/** Graduation 00 · 06 · 12 · 18 · 23 alignée sur la frise. */
export function HoursScale() {
  return (
    <span className="hscale" aria-hidden="true">
      {HOURS.map((hour) => <span key={hour}>{hour % 6 === 0 || hour === 23 ? String(hour).padStart(2, '0') : ''}</span>)}
    </span>
  );
}
