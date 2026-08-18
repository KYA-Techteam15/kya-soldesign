import { useMemo, useState } from 'react';
import { operatingFractionsForSelectedHours } from '@ksd/engine';
import { Dialog } from '../../ui/Dialog.js';
import { useT } from '../../i18n/index.js';

export interface OperatingHoursItem {
  readonly id: string;
  readonly name: string;
  readonly durationHours: number;
  readonly values: readonly number[];
}

export function OperatingHoursDialog({ items, onApply, onClose }: {
  readonly items: readonly OperatingHoursItem[];
  readonly onApply: (valuesById: ReadonlyMap<string, readonly number[]>) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const [index, setIndex] = useState(0);
  const [selectedById, setSelectedById] = useState<ReadonlyMap<string, readonly number[]>>(() => new Map(
    items.map((item) => [item.id, item.values.flatMap((value, hour) => value > 0 ? [hour] : [])]),
  ));
  const item = items[index]!;
  const required = Math.ceil(item.durationHours);
  const selected = selectedById.get(item.id) ?? [];
  const valid = items.every((candidate) => (selectedById.get(candidate.id) ?? []).length === Math.ceil(candidate.durationHours));

  const fractionsById = useMemo(() => {
    if (!valid) return null;
    return new Map(items.map((candidate) => [
      candidate.id,
      operatingFractionsForSelectedHours(candidate.durationHours, selectedById.get(candidate.id) ?? []),
    ]));
  }, [items, selectedById, valid]);

  const toggle = (hour: number) => {
    setSelectedById((current) => {
      const existing = current.get(item.id) ?? [];
      const isSelected = existing.includes(hour);
      if (!isSelected && existing.length >= required) return current;
      const nextHours = isSelected
        ? existing.filter((candidate) => candidate !== hour)
        : [...existing, hour].sort((left, right) => left - right);
      const next = new Map(current);
      next.set(item.id, nextHours);
      return next;
    });
  };

  return <Dialog
    title="Ajuster les heures de fonctionnement"
    lead={`${item.name || 'Appareil sans nom'} · ${index + 1}/${items.length}`}
    wide
    onClose={onClose}
    footer={<>
      <button className="btn btn-ghost" onClick={onClose}>{t('g.cancel')}</button>
      <button className="btn" disabled={index === 0} onClick={() => setIndex((value) => value - 1)}>← Précédent</button>
      <button className="btn" disabled={index === items.length - 1} onClick={() => setIndex((value) => value + 1)}>Suivant →</button>
      <span className="sep" />
      <button className="btn btn-ok" disabled={fractionsById === null} onClick={() => { if (fractionsById) onApply(fractionsById); }}>{t('g.confirm')}</button>
    </>}
  >
    <p className="label">
      Positionnez les {item.durationHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h saisies dans le tableau. Le nombre d’heures reste inchangé.
    </p>
    <div className="operating-periods" style={{ marginTop: 'var(--sp-3)' }}>
      <HourPeriod
        title="Journée"
        hours={Array.from({ length: 12 }, (_, hour) => hour + 6)}
        selected={selected}
        required={required}
        durationHours={item.durationHours}
        onToggle={toggle}
      />
      <HourPeriod
        title="Nuit"
        hours={[...Array.from({ length: 6 }, (_, hour) => hour + 18), ...Array.from({ length: 6 }, (_, hour) => hour)]}
        selected={selected}
        required={required}
        durationHours={item.durationHours}
        onToggle={toggle}
      />
    </div>
    <div className={`alert ${selected.length === required ? 'ok' : 'warn'}`} style={{ marginTop: 'var(--sp-3)' }} role="status">
      <b>{selected.length}/{required} positions</b>
      {selected.length === required
        ? 'La durée saisie est entièrement positionnée.'
        : `Sélectionnez encore ${required - selected.length} position(s).`}
      {item.durationHours % 1 !== 0 && selected.length === required && (
        <> La dernière position chronologique porte la fraction {item.durationHours % 1}.</>
      )}
    </div>
  </Dialog>;
}

function HourPeriod({ title, hours, selected, required, durationHours, onToggle }: {
  readonly title: string;
  readonly hours: readonly number[];
  readonly selected: readonly number[];
  readonly required: number;
  readonly durationHours: number;
  readonly onToggle: (hour: number) => void;
}) {
  return <fieldset className="operating-period">
    <legend>{title}</legend>
    <div className="operating-hours">
      {hours.map((hour) => {
        const active = selected.includes(hour);
        const fractionalHour = active && selected.length === required && durationHours % 1 !== 0
          && hour === Math.max(...selected);
        const endHour = (hour + 1) % 24;
        const interval = `${String(hour).padStart(2, '0')}:00 - ${String(endHour).padStart(2, '0')}:00`;
        return <label className="operating-hour" key={hour}>
          <input
            type="checkbox"
            aria-label={interval}
            checked={active}
            disabled={!active && selected.length >= required}
            onChange={() => onToggle(hour)}
          />
          <span>{interval}</span>
          {fractionalHour && <small>{durationHours % 1} h</small>}
        </label>;
      })}
    </div>
  </fieldset>;
}
