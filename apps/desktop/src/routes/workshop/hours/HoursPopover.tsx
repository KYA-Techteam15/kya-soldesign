import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HOUR_PRESETS, formatHourBlocks, scheduleFromHours, selectedHours } from '../../../app/models/operatingHours';
import { fmt } from '../../../domain/format';
import { fill, useT } from '../../../i18n';
import { useHourPainter } from './useHourPainter';

const ROWS = [Array.from({ length: 12 }, (_, hour) => hour), Array.from({ length: 12 }, (_, hour) => hour + 12)];

/**
 * Horaire d'un appareil, ouvert d'un clic sur sa ligne. On peint les heures ; si leur nombre
 * diffère de la durée saisie, la durée suit le dessin et la fenêtre l'annonce avant validation.
 */
export function HoursPopover({ anchor, name, durationHours, fractions, onApply, onClose }: {
  readonly anchor: DOMRect;
  readonly name: string;
  readonly durationHours: number;
  readonly fractions: readonly number[];
  readonly onApply: (schedule: { readonly durationHours: number; readonly fractions: number[] }) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [hours, setHours] = useState<ReadonlySet<number>>(() => new Set(selectedHours(fractions)));
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: anchor.bottom + 6, left: anchor.left });
  const paint = useHourPainter((_row, hour) => hours.has(hour), (_row, hour, on) => setHours((current) => {
    const next = new Set(current);
    if (on) next.add(hour); else next.delete(hour);
    return next;
  }));

  // Sous la ligne si la place le permet, au-dessus sinon ; toujours dans la fenêtre.
  useLayoutEffect(() => {
    const box = panel.current?.getBoundingClientRect();
    if (!box) return;
    const below = anchor.bottom + 6;
    const top = below + box.height > window.innerHeight - 8 ? Math.max(8, anchor.top - box.height - 6) : below;
    const left = Math.min(Math.max(8, anchor.left), window.innerWidth - box.width - 8);
    setPosition({ top, left });
  }, [anchor]);

  useEffect(() => {
    panel.current?.querySelector<HTMLButtonElement>('.hcell')?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); onClose(); } };
    const onOutside = (event: PointerEvent) => { if (panel.current && !panel.current.contains(event.target as Node)) onClose(); };
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('pointerdown', onOutside, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointerdown', onOutside, true);
    };
  }, [onClose]);

  const list = [...hours].sort((left, right) => left - right);
  const next = scheduleFromHours(durationHours, list);
  const durationChanges = next.durationHours !== durationHours;

  return createPortal(
    <div ref={panel} className="hpop" role="dialog" aria-labelledby={titleId} style={{ top: position.top, left: position.left }}>
      <header>
        <b id={titleId}>{fill(t('hours.popoverTitle'), { name: name || t('hours2.unnamed') })}</b>
        <span className={`hcount ${durationChanges ? 'warn' : 'ok'}`}>{fill(t('hours.selected'), { count: fmt(list.length, 0) })}</span>
      </header>
      {ROWS.map((row) => (
        <div className="hrow" key={row[0]}>
          {row.map((hour) => (
            <span className="hcol" key={hour}>
              <small>{String(hour).padStart(2, '0')}</small>
              <button type="button" className={`hcell ${hours.has(hour) ? 'on' : ''}`} aria-pressed={hours.has(hour)}
                aria-label={`${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`} {...paint('one', hour)} />
            </span>
          ))}
        </div>
      ))}
      <p className="hnote">{list.length === 0 ? t('hours.none') : formatHourBlocks(list)}
        {durationChanges && <> · <span className="warn">{fill(t('hours.durationWillChange'), { from: fmt(durationHours, durationHours % 1 ? 2 : 0), to: fmt(next.durationHours, 0) })}</span></>}
      </p>
      <div className="hpresets" role="group" aria-label={t('hours.presets')}>
        <span className="label">{t('hours.presets')}</span>
        {HOUR_PRESETS.map((preset) => (
          <button type="button" className="btn btn-sm" key={preset.id} onClick={() => setHours(new Set(preset.hours))}>
            {preset.hours.length === 24 ? t('hours.allDay') : formatHourBlocks(preset.hours)}
          </button>
        ))}
      </div>
      <footer>
        <span className="label">{t('hours.paintHint')}</span>
        <span className="sep" />
        <button type="button" className="btn btn-ghost" onClick={onClose}>{t('g.cancel')}</button>
        <button type="button" className="btn btn-ok" onClick={() => onApply(next)}>{t('g.confirm')}</button>
      </footer>
    </div>,
    document.body,
  );
}
