import { useEffect, useRef } from 'react';
import { Dialog } from '../../ui/Dialog.js';
import { useT } from '../../i18n/index.js';

export function OperatingHoursDialog({
  equipmentName,
  values,
  onChange,
  onClose,
}: {
  readonly equipmentName: string;
  readonly values: readonly number[];
  readonly onChange: (values: number[]) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const firstInput = useRef<HTMLInputElement>(null);
  useEffect(() => { firstInput.current?.focus(); }, []);
  const setHour = (hour: number, raw: string) => {
    const parsed = Number.parseFloat(raw.replace(',', '.'));
    const next = [...values];
    next[hour] = Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : 0;
    onChange(next);
  };
  const total = values.reduce((sum, value) => sum + value, 0);
  return <Dialog
    title="Temps de fonctionnement"
    lead={equipmentName}
    wide
    onClose={onClose}
    footer={<><span className="label">Durée totale : {total.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h/j</span><span className="sep" /><button className="btn btn-ok" onClick={onClose}>{t('hours.done')}</button></>}
  >
    <p className="label">Saisissez une fraction de 0 à 1 pour chaque heure. Une valeur 1 signifie toute l’heure; 0,5 signifie trente minutes.</p>
    {[0, 12].map((offset) => <div className="hourgrid" key={offset} style={{ marginTop: 'var(--sp-3)' }}>
      {values.slice(offset, offset + 12).map((value, index) => {
        const hour = offset + index;
        return <div key={hour}><span>{String(hour).padStart(2, '0')}h</span><input ref={hour === 0 ? firstInput : undefined} className="cell-in" aria-label={`Fraction de fonctionnement à ${hour} h`} inputMode="decimal" value={value} onChange={(event) => setHour(hour, event.target.value)} /></div>;
      })}
    </div>)}
    <div className="rowline" style={{ marginTop: 'var(--sp-3)' }}><button className="btn" onClick={() => onChange(Array.from({ length: 24 }, () => 0))}>{t('hours.clear')}</button><button className="btn" onClick={() => onChange(Array.from({ length: 24 }, () => 1))}>{t('hours.allDay')}</button></div>
  </Dialog>;
}
