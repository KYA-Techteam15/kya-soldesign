import { useMemo, useRef, useState } from 'react';
import { validateAnnualCalendar } from '@ksd/engine';
import type { LoadCalendarView, LoadCompositionView } from '../../app/models/projectView';
import { Dialog } from '../../ui/Dialog';
import { exportHourlyProfileWorkbook, inspectHourlyProfileWorkbook } from '../../app/services/loadWorkbooks';
import { useT } from '../../i18n';

type Organization = LoadCompositionView['organization'];

export function ComposedProfilesDialog({ open, initial, onCancel, onApply }: {
  readonly open: boolean;
  readonly initial: LoadCompositionView | null;
  readonly onCancel: () => void;
  readonly onApply: (composition: LoadCompositionView) => void;
}) {
  const t = useT();
  const [draft, setDraft] = useState<LoadCompositionView>(() => initial ?? makeDefaultComposition());
  const [selectedProfileId, setSelectedProfileId] = useState(() => (initial ?? makeDefaultComposition()).profiles[0]?.id ?? '');
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const selected = draft.profiles.find((profile) => profile.id === selectedProfileId) ?? draft.profiles[0];
  const issues = useMemo(() => validateComposition(draft), [draft]);
  if (!open) return null;
  const updateDraft = (fn: (current: LoadCompositionView) => LoadCompositionView) => setDraft((current) => fn(current));
  const changeOrganization = (organization: Organization) => updateDraft((current) => ({
    ...current,
    organization,
    calendar: calendarForOrganization(organization, current.calendar, current.profiles[0]?.id ?? ''),
  }));
  const addProfile = (duplicate = false) => {
    const source = duplicate ? selected : undefined;
    const id = `composed-${Date.now()}`;
    const profile = source === undefined
      ? { id, name: `Profil ${draft.profiles.length + 1}`, color: '#F99D32', hourly: hours(0) }
      : { ...structuredClone(source), id, name: `${source.name} — copie` };
    updateDraft((current) => ({ ...current, profiles: [...current.profiles, profile] }));
    setSelectedProfileId(id);
  };
  const updateSelected = (fn: (profile: NonNullable<typeof selected>) => NonNullable<typeof selected>) => {
    if (selected === undefined) return;
    updateDraft((current) => ({ ...current, profiles: current.profiles.map((profile) => profile.id === selected.id ? fn(profile) : profile) }));
  };
  const removeSelected = () => {
    if (selected === undefined || draft.profiles.length <= 1) return;
    const next = draft.profiles.filter((profile) => profile.id !== selected.id);
    updateDraft((current) => ({
      ...current,
      profiles: next,
      calendar: { ...current.calendar, assignments: current.calendar.assignments.map((assignment) => assignment.profileId === selected.id ? { ...assignment, profileId: next[0]!.id } : assignment) },
    }));
    setSelectedProfileId(next[0]!.id);
  };
  const exportSelected = () => {
    if (selected === undefined) return;
    const bytes = exportHourlyProfileWorkbook(selected.hourly.map((point) => ({ hourIndex: point.hour, activePowerKw: point.realPower, peakPowerKw: point.peakPower })));
    const blob = new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${selected.name.replace(/[^a-z0-9]+/giu, '-').toLowerCase() || 'profil'}.xlsx`; link.click(); URL.revokeObjectURL(link.href);
  };
  const importSelected = async (file: File) => {
    const result = inspectHourlyProfileWorkbook(await file.arrayBuffer());
    if (result.status === 'invalid') { setImportMessage(result.issues.slice(0, 2).map((issue) => `${issue.columnName || issue.cellAddress}: ${issue.message}`).join(' · ')); return; }
    if (selected === undefined) return;
    updateSelected((profile) => ({ ...profile, hourly: result.candidate.map((point) => ({ hour: point.hourIndex, realPower: point.activePowerKw, peakPower: point.peakPowerKw ?? point.activePowerKw })) }));
    setImportMessage(result.warnings.length > 0 ? 'Profil importé ; les pointes vides ont été ramenées à la moyenne.' : 'Profil importé et validé.');
  };

  return <Dialog
    title="Composer les profils annuels"
    lead="calendrier, combinaisons et valeurs de puissance de 00 h à 23 h"
    wide
    onClose={onCancel}
    footer={<>
      <button className="btn btn-ghost" onClick={() => {
        const example = makeExampleComposition();
        setDraft(example);
        setSelectedProfileId(example.profiles[0]!.id);
        setImportMessage(t('loads.composedExampleLoaded'));
      }}>{t('loads.composedExample')}</button>
      <span className="sep" />
      <button className="btn btn-ghost" onClick={onCancel}>{t('loads.composedCancel')}</button>
      <button className="btn btn-ok" disabled={issues.length > 0} onClick={() => onApply(structuredClone(draft))}>{t('loads.composedApply')}</button>
    </>}
  >
    <div className="composed-dialog">
      <section className="composed-section">
        <div className="tbl-title"><h2 className="h-sec">{t('loads.composedOrganization')}</h2><span className="label">{t('loads.composedOneMethod')}</span></div>
        <div className="seg" role="radiogroup" aria-label="Organisation des profils">
          <button role="radio" aria-checked={draft.organization === 'workweek-weekend'} className={draft.organization === 'workweek-weekend' ? 'active' : ''} onClick={() => changeOrganization('workweek-weekend')}>Ouvrés / week-end</button>
          <button role="radio" aria-checked={draft.organization === 'periods'} className={draft.organization === 'periods' ? 'active' : ''} onClick={() => changeOrganization('periods')}>{t('loads.composedPeriods')}</button>
          <button role="radio" aria-checked={draft.organization === 'periods-by-day-type'} className={draft.organization === 'periods-by-day-type' ? 'active' : ''} onClick={() => changeOrganization('periods-by-day-type')}>{t('loads.composedPeriodDays')}</button>
        </div>
        <p className="hint">{t('loads.composedDirectHint')}</p>
      </section>

      <section className="composed-section">
        <div className="tbl-title"><h2 className="h-sec">{t('loads.composedCalendar')}</h2><span className="label">{t('loads.composedCalendarHint')}</span><button className="btn" onClick={() => updateDraft((current) => ({ ...current, calendar: addPeriod(current.calendar, current.profiles[0]?.id ?? '') }))}>{t('loads.calendarAddPeriod')}</button></div>
        <div className="composed-calendar">
          <div className="composed-periods">
            {draft.calendar.periods.map((period, index) => <div className="composed-period" key={period.id}>
              <input aria-label={`Nom de la période ${index + 1}`} value={period.name} onChange={(event) => updateDraft((current) => ({ ...current, calendar: { ...current.calendar, periods: current.calendar.periods.map((item) => item.id === period.id ? { ...item, name: event.target.value } : item) } }))} />
              <input aria-label={`Début de ${period.name}`} placeholder="MM-JJ" value={period.startMonthDay} onChange={(event) => updateDraft((current) => ({ ...current, calendar: { ...current.calendar, periods: current.calendar.periods.map((item) => item.id === period.id ? { ...item, startMonthDay: event.target.value } : item) } }))} />
              <span>→</span>
              <input aria-label={`Fin de ${period.name}`} placeholder="MM-JJ" value={period.endMonthDay} onChange={(event) => updateDraft((current) => ({ ...current, calendar: { ...current.calendar, periods: current.calendar.periods.map((item) => item.id === period.id ? { ...item, endMonthDay: event.target.value } : item) } }))} />
            </div>)}
          </div>
          <div className="composed-matrix">
            <div className="composed-matrix-head"><span>{t('loads.calendarPeriod')}</span>{draft.calendar.dayGroups.map((group) => <span key={group.id}>{groupLabel(group.kind, t)}</span>)}</div>
            {draft.calendar.periods.map((period) => <div className="composed-matrix-row" key={period.id}>
              <b>{period.name}</b>
              {draft.calendar.dayGroups.map((group) => {
                const assignment = draft.calendar.assignments.find((item) => item.periodId === period.id && item.dayGroupId === group.id);
                return <select key={group.id} aria-label={`${period.name}, ${groupLabel(group.kind, t)}`} value={assignment?.profileId ?? ''} onChange={(event) => updateDraft((current) => ({ ...current, calendar: { ...current.calendar, assignments: current.calendar.assignments.map((item) => item.periodId === period.id && item.dayGroupId === group.id ? { ...item, profileId: event.target.value } : item) } }))}>
                  <option value="">{t('loads.composedChooseProfile')}</option>{draft.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                </select>;
              })}
            </div>)}
          </div>
        </div>
      </section>

      <section className="composed-section">
        <div className="tbl-title"><h2 className="h-sec">{t('loads.composedHourly')}</h2><span className="label">{t('loads.composedHourlyHint')}</span><button className="btn" onClick={() => addProfile(false)}>{t('loads.calendarNewProfile')}</button><button className="btn" disabled={selected === undefined} onClick={() => addProfile(true)}>{t('loads.composedDuplicate')}</button><button className="btn" disabled={selected === undefined || draft.profiles.length <= 1} onClick={removeSelected}>{t('loads.composedDelete')}</button><button className="btn" disabled={selected === undefined} onClick={exportSelected}>{t('loads.composedExport')}</button><button className="btn" disabled={selected === undefined} onClick={() => importRef.current?.click()}>{t('loads.composedImport')}</button></div>
        <div className="composed-profile-layout">
          <div className="composed-profile-list" role="listbox" aria-label="Profils disponibles">
            {draft.profiles.map((profile) => <button key={profile.id} className={profile.id === selected?.id ? 'selected' : ''} onClick={() => setSelectedProfileId(profile.id)}>{profile.name}</button>)}
          </div>
          {selected && <div className="composed-profile-editor">
            <div className="form-rows composed-profile-meta"><label><span>{t('loads.composedName')}</span><input value={selected.name} onChange={(event) => updateSelected((profile) => ({ ...profile, name: event.target.value }))} /></label><label><span>{t('loads.composedColor')}</span><input type="color" value={selected.color} onChange={(event) => updateSelected((profile) => ({ ...profile, color: event.target.value }))} /></label></div>
            <div className="hourgrid composed-hourgrid">{selected.hourly.map((point) => <label key={point.hour}><span>{String(point.hour).padStart(2, '0')} h</span><input aria-label={`Puissance à ${point.hour} h`} inputMode="decimal" value={point.realPower} onChange={(event) => { const value = Number(event.target.value.replace(',', '.')); if (!Number.isFinite(value) || value < 0) return; updateSelected((profile) => ({ ...profile, hourly: profile.hourly.map((item) => item.hour === point.hour ? { ...item, realPower: value, peakPower: Math.max(value, item.peakPower) } : item) })); }} /></label>)}</div>
          </div>}
        </div>
      </section>

      {issues.length > 0 && <div className="composed-errors" role="alert"><b>{t('loads.composedErrors')}</b><ul>{issues.slice(0, 6).map((issue) => <li key={`${issue.code}:${issue.path}`}>{issue.message}</li>)}</ul></div>}
      {importMessage && <p className="hint" role="status">{importMessage}</p>}
      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSelected(file); event.target.value = ''; }} />
    </div>
  </Dialog>;
}

function validateComposition(composition: LoadCompositionView) {
  const profileIds = new Set(composition.profiles.map((profile) => profile.id));
  const directIssues = composition.profiles.flatMap((profile) => profile.hourly.length !== 24 ? [{ code: 'PROFILE_HOURS_COUNT', path: profile.id, message: `${profile.name} doit contenir 24 heures` }] : profile.hourly.filter((point) => !Number.isFinite(point.realPower) || point.realPower < 0 || point.peakPower < point.realPower).map((point) => ({ code: 'PROFILE_HOUR_INVALID', path: `${profile.id}.${point.hour}`, message: `La puissance de ${point.hour} h est invalide` })));
  const calendarIssues = validateAnnualCalendar(composition.calendar).map((issue) => ({ code: issue.code, path: issue.path, message: issue.message }));
  const unknown = composition.calendar.assignments.filter((assignment) => !profileIds.has(assignment.profileId)).map((assignment) => ({ code: 'PROFILE_UNKNOWN', path: assignment.profileId, message: 'Une combinaison référence un profil inexistant' }));
  return [...directIssues, ...calendarIssues, ...unknown];
}

/**
 * Jeu d'essai cohérent.
 *
 * Quatre profils saisis à la main, c'est une heure de travail avant de pouvoir
 * seulement regarder à quoi ressemble un calendrier annuel. Cet exemple décrit
 * un petit site tertiaire sahélien : deux saisons — chaude et tempérée — et,
 * dans chacune, un rythme de semaine et un rythme de week-end.
 *
 * Les valeurs ne prétendent à rien : elles servent à voir l'outil fonctionner,
 * et l'utilisateur les remplace par les siennes.
 */
export function makeExampleComposition(): LoadCompositionView {
  // Base permanente : froid alimentaire et veilles, jamais nulle.
  const base = 1.2;
  // Bureau : 08 h → 17 h, avec une pause à midi.
  const office = (hour: number) => (hour >= 8 && hour < 12 ? 3.4 : hour >= 12 && hour < 14 ? 1.9 : hour >= 14 && hour < 18 ? 3.1 : 0);
  // Climatisation : elle suit le soleil, et double en saison chaude.
  const cooling = (hour: number) => (hour >= 11 && hour < 17 ? 2.6 : hour >= 10 && hour < 11 ? 1.1 : 0);
  // Soirée : éclairage et usages domestiques.
  const evening = (hour: number) => (hour >= 18 && hour < 22 ? 1.8 : hour >= 22 && hour < 23 ? 0.9 : 0);

  const shape = (coolingFactor: number, officeFactor: number) => Array.from({ length: 24 }, (_, hour) => {
    const mean = base + office(hour) * officeFactor + cooling(hour) * coolingFactor + evening(hour);
    // La pointe couvre les démarrages de la climatisation ; ailleurs, une
    // réserve de 25 % suffit à représenter les appels courts.
    const peak = cooling(hour) > 0 ? mean + cooling(hour) * coolingFactor * 1.5 : mean * 1.25;
    return { hour, realPower: Number(mean.toFixed(3)), peakPower: Number(peak.toFixed(3)) };
  });

  const profiles = [
    { id: 'example-hot-week', name: 'Saison chaude · ouvré', color: '#F99D32', hourly: shape(1, 1) },
    { id: 'example-hot-weekend', name: 'Saison chaude · week-end', color: '#E9724C', hourly: shape(0.6, 0.2) },
    { id: 'example-mild-week', name: 'Saison tempérée · ouvré', color: '#2B9C8F', hourly: shape(0.35, 1) },
    { id: 'example-mild-weekend', name: 'Saison tempérée · week-end', color: '#1CA18C', hourly: shape(0.2, 0.2) },
  ];

  const dayGroups = [
    { id: 'workweek', kind: 'workweek' as const, weekdaysIso: [1, 2, 3, 4, 5] },
    { id: 'weekend', kind: 'weekend' as const, weekdaysIso: [6, 7] },
  ];
  // Deux périodes qui couvrent l'année sans trou ni recouvrement.
  const periods = [
    { id: 'example-hot', name: 'Saison chaude', startMonthDay: '02-01', endMonthDay: '05-31' },
    { id: 'example-mild', name: 'Saison tempérée', startMonthDay: '06-01', endMonthDay: '01-31' },
  ];

  return {
    organization: 'periods-by-day-type',
    calendar: {
      version: 2, mode: 'periods-by-day-type', dayGroups, periods,
      assignments: [
        { periodId: 'example-hot', dayGroupId: 'workweek', profileId: 'example-hot-week' },
        { periodId: 'example-hot', dayGroupId: 'weekend', profileId: 'example-hot-weekend' },
        { periodId: 'example-mild', dayGroupId: 'workweek', profileId: 'example-mild-week' },
        { periodId: 'example-mild', dayGroupId: 'weekend', profileId: 'example-mild-weekend' },
      ],
    },
    profiles,
  };
}

function makeDefaultComposition(): LoadCompositionView {
  const profiles = [{ id: 'composed-workweek', name: 'Jours ouvrés', color: '#F99D32', hourly: hours(0) }, { id: 'composed-weekend', name: 'Week-end', color: '#2B9C8F', hourly: hours(0) }];
  return { organization: 'workweek-weekend', calendar: calendarForOrganization('workweek-weekend', null, profiles[0]!.id, profiles[1]!.id), profiles };
}

function calendarForOrganization(organization: Organization, previous: LoadCalendarView | null, firstProfileId: string, secondProfileId = firstProfileId): LoadCalendarView {
  const groups = organization === 'periods'
    ? [{ id: 'all-days', kind: 'all-days' as const, weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }]
    : [{ id: 'workweek', kind: 'workweek' as const, weekdaysIso: [1, 2, 3, 4, 5] }, { id: 'weekend', kind: 'weekend' as const, weekdaysIso: [6, 7] }];
  const periods = previous?.periods.length ? structuredClone(previous.periods) : [{ id: 'annual', name: 'Année', startMonthDay: '01-01', endMonthDay: '12-31' }];
  return { version: 2, mode: organization, dayGroups: groups, periods, assignments: periods.flatMap((period) => groups.map((group) => ({ periodId: period.id, dayGroupId: group.id, profileId: group.id === 'weekend' ? secondProfileId : firstProfileId }))) };
}

function addPeriod(calendar: LoadCalendarView, profileId: string): LoadCalendarView {
  const index = calendar.periods.length + 1;
  const period = { id: `period-${Date.now()}`, name: `Période ${index}`, startMonthDay: '01-01', endMonthDay: '12-31' };
  return { ...calendar, periods: [...calendar.periods, period], assignments: [...calendar.assignments, ...calendar.dayGroups.map((group) => ({ periodId: period.id, dayGroupId: group.id, profileId }))] };
}

function hours(value: number) { return Array.from({ length: 24 }, (_, hour) => ({ hour, realPower: value, peakPower: value })); }
function groupLabel(kind: 'all-days' | 'workweek' | 'weekend', t: (key: 'loads.calendarAllDays' | 'loads.calendarWorkweek' | 'loads.calendarWeekend') => string) { return kind === 'all-days' ? t('loads.calendarAllDays') : kind === 'workweek' ? t('loads.calendarWorkweek') : t('loads.calendarWeekend'); }
