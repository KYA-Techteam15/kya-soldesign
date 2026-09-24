import { useMemo, useState } from 'react';
import { Dialog } from '../../../ui/Dialog';
import { HOURS, HOUR_PRESETS, formatHourBlocks, scheduleFromHours, selectedHours } from '../../../app/models/operatingHours';
import { fmt } from '../../../domain/format';
import { fill, useT } from '../../../i18n';
import { useHourPainter } from './useHourPainter';

export interface PlannerAppliance {
  readonly id: string;
  readonly name: string;
  readonly durationHours: number;
  readonly fractions: readonly number[];
  /** Puissance appelée en marche, W ; `null` si la ligne est incomplète. */
  readonly runningPowerW: number | null;
}

/**
 * Planning de tous les appareils : une ligne par appareil, 24 cases à peindre, et la charge
 * résultante sous la grille. Régler dix appareils d'un coup, en voyant l'effet sur la pointe.
 */
export function HoursPlanner({ appliances, onApply, onClose }: {
  readonly appliances: readonly PlannerAppliance[];
  readonly onApply: (schedules: ReadonlyMap<string, { readonly durationHours: number; readonly fractions: number[] }>) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const [hoursById, setHoursById] = useState<ReadonlyMap<string, ReadonlySet<number>>>(() => new Map(appliances.map((item) => [item.id, new Set(selectedHours(item.fractions))])));
  const paint = useHourPainter(
    (row, hour) => hoursById.get(row)?.has(hour) ?? false,
    (row, hour, on) => setHoursById((current) => {
      const next = new Map(current);
      const set = new Set(next.get(row) ?? []);
      if (on) set.add(hour); else set.delete(hour);
      next.set(row, set);
      return next;
    }),
  );
  const setRow = (row: string, hours: readonly number[]) => setHoursById((current) => new Map(current).set(row, new Set(hours)));

  const schedules = useMemo(() => new Map(appliances.map((item) => [item.id, scheduleFromHours(item.durationHours, [...(hoursById.get(item.id) ?? [])])])), [appliances, hoursById]);
  const load = useMemo(() => HOURS.map((hour) => appliances.reduce((total, item) => total + (item.runningPowerW ?? 0) * (schedules.get(item.id)?.fractions[hour] ?? 0), 0)), [appliances, schedules]);
  const peak = Math.max(0, ...load);
  const peakHour = load.indexOf(peak);

  return (
    <Dialog title={t('hours.plannerTitle')} lead={t('hours.paintHint')} extraWide onClose={onClose}
      footer={<>
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('g.cancel')}</button>
        <button type="button" className="btn btn-ok" onClick={() => onApply(schedules)}>{t('g.confirm')}</button>
      </>}>
      <div className="hplanner" role="grid" aria-label={t('hours.plannerTitle')}>
        <div className="hp-row hp-head" role="row">
          <span role="columnheader">{t('loads.name')}</span>
          <span className="hp-cells" role="presentation">{HOURS.map((hour) => <span key={hour}>{hour % 2 === 0 ? String(hour).padStart(2, '0') : ''}</span>)}</span>
          <span role="columnheader">{t('loads.hours')}</span>
          <span role="columnheader">{t('hours.presets')}</span>
        </div>
        {appliances.map((item) => {
          const hours = hoursById.get(item.id) ?? new Set<number>();
          const next = schedules.get(item.id)!;
          const changes = next.durationHours !== item.durationHours;
          return (
            <div className="hp-row" role="row" key={item.id}>
              <span className="hp-name" title={formatHourBlocks([...hours])}>{item.name || t('hours2.unnamed')}</span>
              <span className="hp-cells">
                {HOURS.map((hour) => (
                  <button type="button" key={hour} className={`hcell ${hours.has(hour) ? 'on' : ''}`} aria-pressed={hours.has(hour)}
                    aria-label={`${item.name} · ${String(hour).padStart(2, '0')}:00`} {...paint(item.id, hour)} />
                ))}
              </span>
              <span className={`hcount ${changes ? 'warn' : 'ok'}`} title={changes ? fill(t('hours.durationWillChange'), { from: fmt(item.durationHours, item.durationHours % 1 ? 2 : 0), to: fmt(next.durationHours, 0) }) : undefined}>
                {fmt(next.durationHours, next.durationHours % 1 ? 2 : 0)} h
              </span>
              <select className="cell-in" aria-label={`${t('hours.presets')} · ${item.name}`} value="" onChange={(event) => {
                const preset = HOUR_PRESETS.find((candidate) => candidate.id === event.target.value);
                if (preset) setRow(item.id, preset.hours);
              }}>
                <option value="">—</option>
                {HOUR_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.hours.length === 24 ? t('hours.allDay') : formatHourBlocks(preset.hours)}</option>)}
              </select>
            </div>
          );
        })}
      </div>
      <div className="hp-load" aria-label={t('hours.resultingLoad')}>
        <span className="label">{t('hours.resultingLoad')}</span>
        <span className="hp-bars">
          {load.map((value, hour) => <span key={hour} title={`${String(hour).padStart(2, '0')} h · ${fmt(value / 1000, 2)} kW`} style={{ height: `${peak > 0 ? Math.max(2, (value / peak) * 100) : 2}%` }} />)}
        </span>
        <span className="label">{peak > 0 ? fill(t('hours.peakAt'), { kw: fmt(peak / 1000, 2), hour: String(peakHour).padStart(2, '0') }) : ''}</span>
      </div>
    </Dialog>
  );
}
