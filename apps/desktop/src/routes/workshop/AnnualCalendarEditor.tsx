import type { LoadCalendarView, NamedProfile } from '../../app/models/projectView';
import { useT } from '../../i18n';

const MODE_LABELS: Record<LoadCalendarView['mode'], string> = {
  annual: 'Profil unique pour toute l’année',
  'workweek-weekend': 'Ouvrés et week-end',
  periods: 'Périodes',
  'periods-by-day-type': 'Périodes × types de jour',
};

export function calendarForMode(mode: LoadCalendarView['mode'], profileId: string): LoadCalendarView {
  const dayGroups = mode === 'annual' || mode === 'periods'
    ? [{ id: 'all-days', kind: 'all-days' as const, weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }]
    : [{ id: 'workweek', kind: 'workweek' as const, weekdaysIso: [1, 2, 3, 4, 5] }, { id: 'weekend', kind: 'weekend' as const, weekdaysIso: [6, 7] }];
  const periods = [{ id: 'annual', name: 'Année', startMonthDay: '01-01', endMonthDay: '12-31' }];
  return {
    version: 2, mode, dayGroups, periods,
    assignments: dayGroups.map((group) => ({ periodId: 'annual', dayGroupId: group.id, profileId })),
  };
}

export function AnnualCalendarEditor({ calendar, profiles, activeProfileId, onChange, onActivateProfile, onAddProfile }: {
  readonly calendar: LoadCalendarView;
  readonly profiles: readonly NamedProfile[];
  readonly activeProfileId: string;
  readonly onChange: (calendar: LoadCalendarView) => void;
  readonly onActivateProfile: (profileId: string) => void;
  readonly onAddProfile: () => void;
}) {
  const t = useT();
  const profileName = (id: string) => profiles.find((profile) => profile.id === id)?.name ?? t('loads.calendarMissingProfile');
  const setAssignment = (periodId: string, dayGroupId: string, profileId: string) => {
    const assignments = calendar.assignments.some((item) => item.periodId === periodId && item.dayGroupId === dayGroupId)
      ? calendar.assignments.map((item) => item.periodId === periodId && item.dayGroupId === dayGroupId ? { ...item, profileId } : item)
      : [...calendar.assignments, { periodId, dayGroupId, profileId }];
    onChange({ ...calendar, assignments });
  };
  const setPeriod = (periodId: string, field: 'name' | 'startMonthDay' | 'endMonthDay', value: string) => onChange({
    ...calendar, periods: calendar.periods.map((period) => period.id === periodId ? { ...period, [field]: value } : period),
  });
  const addPeriod = () => {
    const id = `period-${calendar.periods.length + 1}`;
    const period = { id, name: `Période ${calendar.periods.length + 1}`, startMonthDay: '01-01', endMonthDay: '12-31' };
    onChange({ ...calendar, periods: [...calendar.periods, period], assignments: [...calendar.assignments, ...calendar.dayGroups.map((group) => ({ periodId: id, dayGroupId: group.id, profileId: activeProfileId }))] });
  };
  const modeLabel = calendar.mode === 'annual' ? t('loads.calendarAnnualTitle') : MODE_LABELS[calendar.mode];
  return <section className="calendar-editor" aria-label={t('loads.calendarTitle')}>
    <div className="tbl-title"><h2 className="h-sec">{t('loads.calendarTitle')}</h2><span className="label">{modeLabel}</span><span className="sep" /><button className="btn" onClick={onAddProfile}>{t('loads.calendarNewProfile')}</button></div>
    <p className="label">{t('loads.calendarHint')}</p>
    <div className="calendar-matrix">
      <div className="calendar-matrix-head"><span>{t('loads.calendarPeriod')}</span>{calendar.dayGroups.map((group) => <span key={group.id}>{group.kind === 'all-days' ? t('loads.calendarAllDays') : group.kind === 'workweek' ? t('loads.calendarWorkweek') : t('loads.calendarWeekend')}</span>)}</div>
      {calendar.periods.map((period) => <div className="calendar-matrix-row" key={period.id}>
        <div className="calendar-period"><input aria-label={`Nom de ${period.name}`} value={period.name} onChange={(event) => setPeriod(period.id, 'name', event.target.value)} />{calendar.mode === 'periods-by-day-type' && <div><input aria-label={`Début de ${period.name}`} placeholder="MM-JJ" value={period.startMonthDay} onChange={(event) => setPeriod(period.id, 'startMonthDay', event.target.value)} /><span>→</span><input aria-label={`Fin de ${period.name}`} placeholder="MM-JJ" value={period.endMonthDay} onChange={(event) => setPeriod(period.id, 'endMonthDay', event.target.value)} /></div>}</div>
        {calendar.dayGroups.map((group) => {
          const selected = calendar.assignments.find((item) => item.periodId === period.id && item.dayGroupId === group.id)?.profileId ?? activeProfileId;
          return <label key={group.id}><span className="sr-only">Profil {period.name}</span><select value={selected} onChange={(event) => { setAssignment(period.id, group.id, event.target.value); onActivateProfile(event.target.value); }} aria-label={`${period.name} · ${profileName(selected)}`}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select></label>;
        })}
      </div>)}
    </div>
    {calendar.mode === 'periods-by-day-type' && <button className="btn" onClick={addPeriod}>{t('loads.calendarAddPeriod')}</button>}
  </section>;
}
