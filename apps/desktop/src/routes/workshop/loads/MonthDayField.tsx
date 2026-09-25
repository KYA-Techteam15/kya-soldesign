import { useUi } from '../../../store/ui';
import { useT } from '../../../i18n';

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Noms de mois dans la langue de l'interface. */
function monthNames(lang: 'fr' | 'en'): readonly string[] {
  const format = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'short', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, month) => format.format(new Date(Date.UTC(2021, month, 1))).replace('.', ''));
}

/**
 * Date sans année (« MM-JJ ») choisie par jour et mois : plus de saisie « 01-01 » à la main, et
 * jamais de 31 avril. La valeur stockée reste « MM-JJ ».
 */
export function MonthDayField({ value, onChange, label }: { readonly value: string; readonly onChange: (value: string) => void; readonly label: string }) {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const [monthText = '01', dayText = '01'] = value.split('-');
  const month = Math.min(12, Math.max(1, Number(monthText) || 1));
  const day = Math.min(DAYS_IN_MONTH[month - 1]!, Math.max(1, Number(dayText) || 1));
  const emit = (nextMonth: number, nextDay: number) => {
    const clamped = Math.min(DAYS_IN_MONTH[nextMonth - 1]!, nextDay);
    onChange(`${String(nextMonth).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`);
  };
  return (
    <span className="monthday" role="group" aria-label={label}>
      <select aria-label={`${label} · ${t('loads.dayShort')}`} value={day} onChange={(event) => emit(month, Number(event.target.value))}>
        {Array.from({ length: DAYS_IN_MONTH[month - 1]! }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
      </select>
      <select aria-label={`${label} · ${t('loads.monthShort')}`} value={month} onChange={(event) => emit(Number(event.target.value), day)}>
        {monthNames(lang).map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
      </select>
    </span>
  );
}
