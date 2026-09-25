import { saveFile, safeFileName } from '../../app/platform/files';
import { useMemo, useRef, useState } from 'react';
import { validateAnnualCalendar } from '@ksd/engine';
import type { ApplianceView, LoadCalendarView, LoadCompositionView } from '../../app/models/projectView';
import { inventoryDirectProfile } from '../../app/models/loadSources';
import { YearPreview } from './loads/ComposedSummary';
import { MonthDayField } from './loads/MonthDayField';
import { TypicalDayEditor } from './loads/TypicalDayEditor';
import { Dialog } from '../../ui/Dialog';
import { exportHourlyProfileWorkbook, inspectHourlyProfileWorkbook } from '../../app/services/loadWorkbooks';
import { fill, tr, useT } from '../../i18n';

type Organization = LoadCompositionView['organization'];

export function ComposedProfilesDialog({ open, initial, inventory = [], onCancel, onApply }: {
  readonly open: boolean;
  readonly initial: LoadCompositionView | null;
  /** Appareils recensés : « Depuis l'inventaire » en tire un profil de départ. */
  readonly inventory?: readonly ApplianceView[];
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
      ? { id, name: fill(tr('composed.profileN'), { n: draft.profiles.length + 1 }), color: '#F99D32', hourly: hours(0) }
      : { ...structuredClone(source), id, name: `${source.name} — ${tr('composed.copy')}` };
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
    void saveFile({ suggestedName: `${safeFileName(selected.name, 'profil')}.xlsx`, data: new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filter: { name: 'Excel', extensions: ['xlsx'] }, openAfterSave: true });
  };
  const importSelected = async (file: File) => {
    const result = inspectHourlyProfileWorkbook(await file.arrayBuffer());
    if (result.status === 'invalid') { setImportMessage(result.issues.slice(0, 2).map((issue) => `${issue.columnName || issue.cellAddress}: ${issue.message}`).join(' · ')); return; }
    if (selected === undefined) return;
    updateSelected((profile) => ({ ...profile, hourly: result.candidate.map((point) => ({ hour: point.hourIndex, realPower: point.activePowerKw, peakPower: point.peakPowerKw ?? point.activePowerKw })) }));
    setImportMessage(result.warnings.length > 0 ? t('composed.profilImporteLesPointes') : t('composed.profilImporteEtValide'));
  };

  const setPeriod = (periodId: string, patch: Partial<LoadCalendarView['periods'][number]>) => updateDraft((current) => ({ ...current, calendar: { ...current.calendar, periods: current.calendar.periods.map((item) => item.id === periodId ? { ...item, ...patch } : item) } }));
  const setAssignment = (periodId: string, dayGroupId: string, profileId: string) => updateDraft((current) => ({ ...current, calendar: { ...current.calendar, assignments: current.calendar.assignments.map((item) => item.periodId === periodId && item.dayGroupId === dayGroupId ? { ...item, profileId } : item) } }));
  const removePeriod = (periodId: string) => updateDraft((current) => ({ ...current, calendar: { ...current.calendar, periods: current.calendar.periods.filter((item) => item.id !== periodId), assignments: current.calendar.assignments.filter((item) => item.periodId !== periodId) } }));
  const datedPeriods = draft.organization !== 'workweek-weekend';

  return <Dialog
    title={t('composed.composerLesProfilsAnnuels')}
    lead={t('composed.calendrierCombinaisonsEtValeurs')}
    extraWide
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
    {/* Trois zones visibles ensemble (spec 012, FR-A5) : l'organisation en tête, puis le calendrier
        à gauche et le profil choisi à droite, édité comme la journée type. */}
    <div className="composed-dialog">
      <div className="composed-org">
        <div className="seg" role="radiogroup" aria-label={t('composed.organisationDesProfils')}>
          <button role="radio" aria-checked={draft.organization === 'workweek-weekend'} onClick={() => changeOrganization('workweek-weekend')}>{t('composed.ouvresWeekEnd')}</button>
          <button role="radio" aria-checked={draft.organization === 'periods'} onClick={() => changeOrganization('periods')}>{t('loads.composedPeriods')}</button>
          <button role="radio" aria-checked={draft.organization === 'periods-by-day-type'} onClick={() => changeOrganization('periods-by-day-type')}>{t('loads.composedPeriodDays')}</button>
        </div>
        <p className="label">{t('loads.composedDirectHint')}</p>
      </div>

      <div className="composed-columns">
        <section className="composed-col" aria-labelledby="composed-calendar-title">
          <div className="tbl-title">
            <h2 className="h-sec" id="composed-calendar-title">{t('loads.composedCalendar')}</h2><span className="sep" />
            {datedPeriods && <button className="btn" onClick={() => updateDraft((current) => ({ ...current, calendar: addPeriod(current.calendar, current.profiles[0]?.id ?? '') }))}>{t('loads.calendarAddPeriod')}</button>}
          </div>
          <div className="composed-periods">
            {draft.calendar.periods.map((period, index) => (
              <div className="composed-period-card" key={period.id}>
                <div className="composed-period-head">
                  <input className="period-name" aria-label={fill(t('composed.periodNameN'), { n: index + 1 })} value={period.name} onChange={(event) => setPeriod(period.id, { name: event.target.value })} />
                  {datedPeriods && draft.calendar.periods.length > 1 && <button type="button" className="btn btn-ghost" aria-label={`${t('loads.composedDelete')} · ${period.name}`} onClick={() => removePeriod(period.id)}>×</button>}
                </div>
                {datedPeriods && (
                  <div className="composed-period-dates">
                    <span className="label">{t('composed.from')}</span>
                    <MonthDayField label={`${t('calendar2.startOf')} ${period.name}`} value={period.startMonthDay} onChange={(value) => setPeriod(period.id, { startMonthDay: value })} />
                    <span className="label">{t('composed.to')}</span>
                    <MonthDayField label={`${t('calendar2.endOf')} ${period.name}`} value={period.endMonthDay} onChange={(value) => setPeriod(period.id, { endMonthDay: value })} />
                  </div>
                )}
                <div className="composed-period-assign">
                  {draft.calendar.dayGroups.map((group) => {
                    const assignment = draft.calendar.assignments.find((item) => item.periodId === period.id && item.dayGroupId === group.id);
                    return (
                      <label key={group.id}><span>{groupLabel(group.kind, t)}</span>
                        <select aria-label={`${period.name}, ${groupLabel(group.kind, t)}`} value={assignment?.profileId ?? ''} onChange={(event) => setAssignment(period.id, group.id, event.target.value)}>
                          <option value="">{t('loads.composedChooseProfile')}</option>
                          {draft.profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
                        </select>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <YearPreview composition={draft} />
        </section>

        <section className="composed-col" aria-labelledby="composed-profile-title">
          <div className="tbl-title">
            <h2 className="h-sec" id="composed-profile-title">{t('loads.composedHourly')}</h2><span className="sep" />
            <button className="btn" onClick={() => addProfile(false)}>{t('loads.calendarNewProfile')}</button>
          </div>
          <div className="composed-profile-tabs" role="tablist" aria-label={t('composed.profilsDisponibles')}>
            {draft.profiles.map((profile) => (
              <button key={profile.id} role="tab" aria-selected={profile.id === selected?.id} onClick={() => setSelectedProfileId(profile.id)}>
                <i style={{ background: profile.color }} aria-hidden="true" />{profile.name}
              </button>
            ))}
          </div>
          {selected && (
            <div className="composed-profile-editor">
              <div className="composed-profile-meta">
                <label><span>{t('loads.composedName')}</span><input value={selected.name} onChange={(event) => updateSelected((profile) => ({ ...profile, name: event.target.value }))} /></label>
                <label><span>{t('loads.composedColor')}</span><input type="color" value={selected.color} onChange={(event) => updateSelected((profile) => ({ ...profile, color: event.target.value }))} /></label>
              </div>
              <div className="composed-profile-actions">
                <button className="btn" disabled={inventory.length === 0} title={inventory.length === 0 ? t('loads.fromInventoryEmpty') : t('loads.fromInventoryHelp')} onClick={() => updateSelected((profile) => ({ ...profile, hourly: inventoryDirectProfile(inventory, profile).hourly }))}>{t('loads.fromInventory')}</button>
                <button className="btn" onClick={() => addProfile(true)}>{t('loads.composedDuplicate')}</button>
                <button className="btn" onClick={exportSelected}>{t('loads.composedExport')}</button>
                <button className="btn" onClick={() => importRef.current?.click()}>{t('loads.composedImport')}</button>
                <button className="btn btn-ghost" disabled={draft.profiles.length <= 1} onClick={removeSelected}>{t('loads.composedDelete')}</button>
              </div>
              <TypicalDayEditor
                hourly={selected.hourly.map((point) => ({ hour: point.hour, realPower: point.realPower, peakPower: point.peakPower > point.realPower ? point.peakPower : null }))}
                mutate={(change) => updateSelected((profile) => {
                  const points = profile.hourly.map((point) => ({ hour: point.hour, realPower: point.realPower, peakPower: point.peakPower > point.realPower ? point.peakPower : null as number | null }));
                  change(points);
                  return { ...profile, hourly: points.map((point) => ({ hour: point.hour, realPower: point.realPower, peakPower: point.peakPower ?? point.realPower })) };
                })}
              />
            </div>
          )}
        </section>
      </div>

      {issues.length > 0 && <div className="composed-errors" role="alert"><b>{t('loads.composedErrors')}</b><ul>{issues.slice(0, 6).map((issue) => <li key={`${issue.code}:${issue.path}`}>{issue.message}</li>)}</ul></div>}
      {importMessage && <p className="hint" role="status">{importMessage}</p>}
      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importSelected(file); event.target.value = ''; }} />
    </div>
  </Dialog>;
}

function validateComposition(composition: LoadCompositionView) {
  const profileIds = new Set(composition.profiles.map((profile) => profile.id));
  const directIssues = composition.profiles.flatMap((profile) => profile.hourly.length !== 24 ? [{ code: 'PROFILE_HOURS_COUNT', path: profile.id, message: fill(tr('composed.needs24Hours'), { name: profile.name }) }] : profile.hourly.filter((point) => !Number.isFinite(point.realPower) || point.realPower < 0 || point.peakPower < point.realPower).map((point) => ({ code: 'PROFILE_HOUR_INVALID', path: `${profile.id}.${point.hour}`, message: fill(tr('composed.invalidPowerAt'), { hour: point.hour }) })));
  const calendarIssues = validateAnnualCalendar(composition.calendar).map((issue) => ({ code: issue.code, path: issue.path, message: issue.message }));
  const unknown = composition.calendar.assignments.filter((assignment) => !profileIds.has(assignment.profileId)).map((assignment) => ({ code: 'PROFILE_UNKNOWN', path: assignment.profileId, message: tr('composed.uneCombinaisonReferenceUn') }));
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
    { id: 'example-hot-week', name: tr('composed.saisonChaudeOuvre'), color: '#F99D32', hourly: shape(1, 1) },
    { id: 'example-hot-weekend', name: tr('composed.saisonChaudeWeekEnd'), color: '#E9724C', hourly: shape(0.6, 0.2) },
    { id: 'example-mild-week', name: tr('composed.saisonTempereeOuvre'), color: '#2B9C8F', hourly: shape(0.35, 1) },
    { id: 'example-mild-weekend', name: tr('composed.saisonTempereeWeekEnd'), color: '#1CA18C', hourly: shape(0.2, 0.2) },
  ];

  const dayGroups = [
    { id: 'workweek', kind: 'workweek' as const, weekdaysIso: [1, 2, 3, 4, 5] },
    { id: 'weekend', kind: 'weekend' as const, weekdaysIso: [6, 7] },
  ];
  // Deux périodes qui couvrent l'année sans trou ni recouvrement.
  const periods = [
    { id: 'example-hot', name: tr('composed.saisonChaude'), startMonthDay: '02-01', endMonthDay: '05-31' },
    { id: 'example-mild', name: tr('composed.saisonTemperee'), startMonthDay: '06-01', endMonthDay: '01-31' },
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
  const profiles = [{ id: 'composed-workweek', name: tr('composed.joursOuvres'), color: '#F99D32', hourly: hours(0) }, { id: 'composed-weekend', name: tr('loads.calendarWeekend'), color: '#2B9C8F', hourly: hours(0) }];
  return { organization: 'workweek-weekend', calendar: calendarForOrganization('workweek-weekend', null, profiles[0]!.id, profiles[1]!.id), profiles };
}

function calendarForOrganization(organization: Organization, previous: LoadCalendarView | null, firstProfileId: string, secondProfileId = firstProfileId): LoadCalendarView {
  const groups = organization === 'periods'
    ? [{ id: 'all-days', kind: 'all-days' as const, weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }]
    : [{ id: 'workweek', kind: 'workweek' as const, weekdaysIso: [1, 2, 3, 4, 5] }, { id: 'weekend', kind: 'weekend' as const, weekdaysIso: [6, 7] }];
  const periods = previous?.periods.length ? structuredClone(previous.periods) : [{ id: 'annual', name: tr('calendar2.year'), startMonthDay: '01-01', endMonthDay: '12-31' }];
  return { version: 2, mode: organization, dayGroups: groups, periods, assignments: periods.flatMap((period) => groups.map((group) => ({ periodId: period.id, dayGroupId: group.id, profileId: group.id === 'weekend' ? secondProfileId : firstProfileId }))) };
}

function addPeriod(calendar: LoadCalendarView, profileId: string): LoadCalendarView {
  const index = calendar.periods.length + 1;
  const period = { id: `period-${Date.now()}`, name: fill(tr('calendar2.periodN'), { n: index }), startMonthDay: '01-01', endMonthDay: '12-31' };
  return { ...calendar, periods: [...calendar.periods, period], assignments: [...calendar.assignments, ...calendar.dayGroups.map((group) => ({ periodId: period.id, dayGroupId: group.id, profileId }))] };
}

function hours(value: number) { return Array.from({ length: 24 }, (_, hour) => ({ hour, realPower: value, peakPower: value })); }
function groupLabel(kind: 'all-days' | 'workweek' | 'weekend', t: (key: 'loads.calendarAllDays' | 'loads.calendarWorkweek' | 'loads.calendarWeekend') => string) { return kind === 'all-days' ? t('loads.calendarAllDays') : kind === 'workweek' ? t('loads.calendarWorkweek') : t('loads.calendarWeekend'); }
