import { saveFile } from '../../app/platform/files';
import { useMemo, useRef, useState } from 'react';
import type { AioSizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useUi, type Toast } from '../../store/ui';
import { StepHead } from '../../ui/Flow';
import { fmt } from '../../domain/format';
import type { LoadCompositionView, LoadSource, NamedProfile } from '../../app/models/projectView';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { fill, tr, useT } from '../../i18n';
import { useCatalog } from '../../app/CatalogProvider';
import { Dialog } from '../../ui/Dialog';
import { exportHourlyProfileWorkbook, inspectHourlyProfileWorkbook } from '../../app/services/loadWorkbooks';
import { AppliancesTable } from './loads/AppliancesTable';
import { DayBalance } from '../../shell/DayBalance';
import { DraftNumberInput } from './loads/DraftNumberInput';
import { ComposedProfilesDialog } from './ComposedProfilesDialog';
import { AnnualLoadChart } from './AnnualLoadChart';
import { buildAnnualLoadPresentationResult } from '../../app/models/annualLoadPresentation';

const MODES: { key: LoadSource; label: string }[] = [
  /* Chaque onglet nomme la manière dont on renseigne la consommation, pas la
     forme du résultat : « Profil horaire » décrivait ce qu'on obtient, alors
     que le choix porte sur ce qu'on saisit. */
  { key: 'equipments', label: 'loads2.recenserLesAppareils' },
  { key: 'hourly', label: 'loads2.saisirHeureParHeure' },
  { key: 'meter', label: 'loads2.partirDeLaFacture' },
];

export function SectionBesoins() {
  const t = useT();
  const project = useProject();
  const update = useProjects((s) => s.update);
  const notify = useUi((s) => s.notify);
  const { loadProfiles } = useCatalog();
  const [showComposer, setShowComposer] = useState(false);
  const [confirmSimpleSwitch, setConfirmSimpleSwitch] = useState(false);
  const [bulkEditor, setBulkEditor] = useState(false);
  const [bulkRange, setBulkRange] = useState({ start: 8, end: 18, meanKw: 0, peakKw: 0 });
  const hourlyImportRef = useRef<HTMLInputElement>(null);

  const profile = project.load.profiles.find(
    (p) => p.id === project.load.activeProfileId,
  )!;
  const composedActive = project.load.activeMode === 'composed' && project.load.composition !== null;
  // Une série de 8 760 points ne se saisit pas à la main : l'écran doit dire
  // ce qu'il détient et proposer d'en sortir, pas afficher les 24 premières
  // heures de l'année en laissant croire qu'elles sont tout le profil.
  const annualSeries = profile.hourly.length === 8_760;

  const calculation = useCalculationState<AioSizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const solarCalculation = useCalculationState<SolarResourceAnalysisOutputV1>(project.id, 'solar-resource', project.updatedAt);

  /**
   * Vue annuelle. Elle demande la météo horaire du site : sans elle, aucune
   * date n'est portée par le profil et la série ne peut pas être construite.
   * Le calcul est mémorisé — il déroule 8 760 heures à chaque frappe sinon.
   */
  const solarOutput = solarCalculation.status === 'ready' ? solarCalculation.envelope.output : null;
  const annual = useMemo(() => buildAnnualLoadPresentationResult(project, solarOutput), [project, solarOutput]);

  const mutateProfile = (fn: (p: NamedProfile) => void) =>
    update((draft) => {
      const p = draft.load.profiles.find((x) => x.id === draft.load.activeProfileId);
      if (p) fn(p);
    });

  const num = (v: string) => {
    const parsed = Number.parseFloat(v.replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  /**
   * Un seul mode pilote le calcul à la fois. Basculer sans le dire ferait croire
   * à une perte de travail : on l'annonce, et on reporte ce qui est reportable.
   */
  const switchMode = (next: LoadSource) => {
    if (next === profile.source) return;
    mutateProfile((p) => {
      p.source = next;
      if (next === 'meter' && p.meter === null) {
        p.meter = {
          observedEnergy: 0,
          observedDays: null,
          normalizedProfileId: null,
          forceYEn: false,
          targetYEn: null,
          meterAmperage: 0,
          networkType: 'single_phase',
          morningPeakStart: '',
          morningPeakEnd: '',
          eveningPeakStart: '',
          eveningPeakEnd: '',
          peakImportance: 0,
          targetQualityFactor: 0,
        };
      }
    });
    const said: Record<LoadSource, string> = {
      equipments: t('loads2.laListeDAppareils'),
      hourly: t('loads2.leProfilHoraireSaisi'),
      meter: t('loads2.lEstimationDepuisLa'),
    };
    notify({ kind: 'info', title: t('loads2.sourceDeCalculChangee'), detail: said[next] });
  };

  const applyComposition = (composition: LoadCompositionView) => update((draft) => {
    draft.load.activeMode = 'composed';
    draft.load.composition = structuredClone(composition);
    draft.load.granularity = composition.organization;
  });

  const downloadWorkbook = (bytes: Uint8Array, filename: string) => {
    void saveFile({ suggestedName: filename, data: new Blob([bytes.slice().buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filter: { name: 'Excel', extensions: ['xlsx'] } });
  };

  const exportHourly = () => downloadWorkbook(exportHourlyProfileWorkbook(profile.hourly.map((point) => ({ hourIndex: point.hour, activePowerKw: point.realPower, peakPowerKw: point.peakPower }))), 'profil-horaire.xlsx');

  return (
    <div className="sheet">
      <StepHead
        slug="besoins"
        aside={
          <>
            {!composedActive && <div className="seg" role="tablist">
              {MODES.map((m) => <button key={m.key} role="tab" aria-selected={profile.source === m.key} onClick={() => switchMode(m.key)}>{t(m.label)}</button>)}
            </div>}
            <button className="btn" onClick={() => setShowComposer(true)}>{composedActive ? t('loads2.modifierLesProfilsComposes') : t('loads2.configurerDesProfilsAnnuels')}</button>
            {composedActive && <button className="btn btn-ghost" onClick={() => setConfirmSimpleSwitch(true)}>{t('loads.composedBackToSimple')}</button>}
          </>
        }
      />

      {composedActive && project.load.composition && <section className="composed-summary" aria-label={t('loads.composedActive')}>
        <div><b>{t('loads.composedActive')}</b><span>{project.load.composition.organization === 'workweek-weekend' ? t('loads.calendarWorkweek') : project.load.composition.organization === 'periods' ? t('loads.composedPeriods') : t('loads.composedPeriodDays')}</span></div>
        <div><b>{project.load.composition.profiles.length}</b><span>profils horaires · {project.load.composition.calendar.periods.length} période(s)</span></div>
        <p>{t('loads2.leDimensionnementUtiliseUniquement')}</p>
      </section>}
      {!composedActive && <>
      {profile.source === 'equipments' && (
        <AppliancesTable
          profile={profile}
          mutate={mutateProfile}
          simultaneityNotice={project.load.simultaneityNotice}
          onDismissNotice={() => update((draft) => { draft.load.simultaneityNotice = null; })}
        />
      )}

      {profile.source === 'hourly' && (
        <section>
          <div className="tbl-title">
            <h2 className="h-sec">{t('loads.hourly')}</h2>
            <span className="label">{annualSeries ? t('loads.annualSeriesLabel') : t('loads.dailySeriesLabel')}</span>
            <span className="sep" />
            {!annualSeries && <button className="btn" onClick={() => setBulkEditor(true)}>
              {t('loads.bulkEdit')}
            </button>}
            <input ref={hourlyImportRef} type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void (file.name.toLowerCase().endsWith('.csv') ? importHourlyCsv(file, mutateProfile, notify) : importHourlyWorkbook(file, mutateProfile, notify)); event.target.value = ''; }} />
            <button className="btn" onClick={() => hourlyImportRef.current?.click()}>{t('loads.importExcel')}</button>
            <button className="btn" onClick={exportHourly}>{t('loads.exportExcel')}</button>
          </div>
          {annualSeries ? <AnnualSeriesPanel
            hourly={profile.hourly}
            onReduceToDay={() => {
              // On repart de la journée la plus chargée : c'est celle que le
              // dimensionnement doit tenir, et la seule dont partir ait un sens.
              const day = heaviestDayIndex(profile.hourly);
              mutateProfile((target) => {
                target.hourly = Array.from({ length: 24 }, (_, hour) => {
                  const point = target.hourly[day * 24 + hour];
                  return { hour, realPower: point?.realPower ?? 0, peakPower: point?.peakPower ?? 0 };
                });
              });
              notify({ kind: 'info', title: t('loads.annualReducedTitle'), detail: t('loads.annualReducedDetail') });
            }}
          /> : <>
          {[0, 12].map((offset) => (
            <div className="hourgrid" key={offset} style={{ marginBottom: 'var(--sp-3)' }}>
              {profile.hourly.slice(offset, offset + 12).map((h) => (
                <div key={h.hour}>
                  <span>{String(h.hour).padStart(2, '0')}</span>
                  <DraftNumberInput
                    className="cell-in"
                    aria-label={fill(t('loads2.powerAtHour'), { hour: h.hour })}
                    value={h.realPower}
                    format={(value) => fmt(value, 2)}
                    onCommit={(value) => {
                      if (value === null) return;
                      mutateProfile((p) => {
                        const next = Math.max(0, value);
                        p.hourly[h.hour].realPower = next;
                        if (p.hourly[h.hour].peakPower < next) p.hourly[h.hour].peakPower = next;
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          ))}
          <div className="tbl-title" style={{ marginTop: 'var(--sp-4)' }}><h2 className="h-sec">{t('loads.hourlyPeak')}</h2><span className="label">{t('loads2.kwChaqueValeurDoit')}</span></div>
          {[0, 12].map((offset) => <div className="hourgrid" key={`peak-${offset}`} style={{ marginBottom: 'var(--sp-3)' }}>{profile.hourly.slice(offset, offset + 12).map((h) => <div key={h.hour}><span>{String(h.hour).padStart(2, '0')}</span><DraftNumberInput className="cell-in" aria-label={fill(t('loads2.peakAtHour'), { hour: h.hour })} value={h.peakPower} format={(value) => fmt(value, 2)} onCommit={(value) => { if (value !== null) mutateProfile((p) => { p.hourly[h.hour].peakPower = Math.max(p.hourly[h.hour].realPower, value); }); }} /></div>)}</div>)}
          </>}
          <CapabilityNotice capability="sizing" state={calculation} compact />
        </section>
      )}

      {profile.source === 'meter' && profile.meter && (
        <section>
          <div className="tbl-title">
            <h2 className="h-sec">{t('loads2.estimationDepuisLaFacture')}</h2>
          </div>
          <div className="form-rows">
            <label>
              <span>{t('loads.observedEnergy')}</span>
              <span className="uf">
                <DraftNumberInput value={profile.meter.observedEnergy}
                  onCommit={(value) => { if (value !== null && value >= 0) mutateProfile((p) => { p.meter!.observedEnergy = value; }); }} />
                <span className="uf-unit">kWh</span>
              </span>
            </label>
            <label><span>{t('loads.observedDays')}</span><DraftNumberInput inputMode="numeric" nullable value={profile.meter.observedDays} onCommit={(value) => { if (value === null || (Number.isInteger(value) && value > 0)) mutateProfile((p) => { p.meter!.observedDays = value; }); }} /></label>
            <label><span>{t('loads.sourcedProfile')}</span><select value={profile.meter.normalizedProfileId ?? ''} onChange={(event) => mutateProfile((p) => { p.meter!.normalizedProfileId = event.target.value || null; })}><option value="">{t('loads.chooseProfile')}</option>{loadProfiles.map((item) => <option key={item.id} value={item.id}>{item.displayName} · {item.provenance.sourceRecordId}</option>)}</select></label>
            <div className="yen-controls" style={{ gridColumn: '1 / -1' }}>
              <label className="checkline">
                <input type="checkbox" checked={profile.meter.forceYEn} onChange={(event) => mutateProfile((p) => { p.meter!.forceYEn = event.target.checked; })} />
                <span>{t('loads.forceYEn')}</span>
              </label>
              {profile.meter.forceYEn && <label><span>{t('loads.targetYEn')}</span><span className="uf"><DraftNumberInput value={profile.meter.targetYEn === null ? null : profile.meter.targetYEn * 100} nullable format={(value) => fmt(value, 1)} onCommit={(value) => mutateProfile((p) => { p.meter!.targetYEn = value === null ? null : Math.min(100, Math.max(0, value)) / 100; })} /><span className="uf-unit">%</span></span></label>}
              <div className="yen-result" role="status">
                <span>{t('loads.calculatedYEn')}</span>
                <b>{solarCalculation.status === 'ready' && solarCalculation.envelope.output.gamma.status === 'available' ? (fmt(solarCalculation.envelope.output.gamma.value * 100, 1) + ' %') : '—'}</b>
              </div>
            </div>
          </div>
        </section>
      )}
      </>}

      {/* Le bilan du jour se lit ici, sous la saisie : le panneau de droite reste replié tant qu'il n'y a pas de prédimensionnement. */}
      <section className="loads-balance"><DayBalance project={project} defaultOpen pinned /></section>

      <AnnualLoadChart result={annual} />

      <ComposedProfilesDialog open={showComposer} initial={project.load.composition} onCancel={() => setShowComposer(false)} onApply={(composition) => { applyComposition(composition); setShowComposer(false); notify({ kind: 'success', title: t('loads2.profilsComposesEnregistres'), detail: t('loads2.leCalendrierAnnuelA') }); }} />
      {confirmSimpleSwitch && <Dialog title={t('loads.composedSwitchTitle')} onClose={() => setConfirmSimpleSwitch(false)} footer={<><button className="btn btn-ghost" onClick={() => setConfirmSimpleSwitch(false)}>{t('g.cancel')}</button><button className="btn btn-ok" onClick={() => { update((draft) => { draft.load.activeMode = 'simple'; }); setConfirmSimpleSwitch(false); }}>{t('g.confirm')}</button></>}><p>{t('loads.composedSwitchBody')}</p></Dialog>}

      {bulkEditor && <Dialog title={t('loads2.editionEnMasseDu')} lead={t('loads2.appliquerUnePuissanceMoyenne')} onClose={() => setBulkEditor(false)} footer={<><button className="btn btn-ghost" onClick={() => setBulkEditor(false)}>{t('g.cancel')}</button><button className="btn btn-ok" onClick={() => { mutateProfile((target) => { target.hourly.forEach((point) => { const included = bulkRange.start <= bulkRange.end ? point.hour >= bulkRange.start && point.hour < bulkRange.end : point.hour >= bulkRange.start || point.hour < bulkRange.end; if (included) { point.realPower = bulkRange.meanKw; point.peakPower = Math.max(bulkRange.meanKw, bulkRange.peakKw); } }); }); setBulkEditor(false); notify({ kind: 'success', title: t('loads2.profilHoraireMisA'), detail: `${String(bulkRange.start).padStart(2, '0')} h → ${String(bulkRange.end).padStart(2, '0')} h` }); }}>{t('loads.apply')}</button></>}>
        <div className="form-rows"><label><span>{t('loads.startHour')}</span><input type="number" min={0} max={23} value={bulkRange.start} onChange={(event) => setBulkRange((current) => ({ ...current, start: clampHour(Number(event.target.value)) }))} /></label><label><span>{t('loads.endHourExcluded')}</span><input type="number" min={0} max={24} value={bulkRange.end} onChange={(event) => setBulkRange((current) => ({ ...current, end: Math.min(24, Math.max(0, Number(event.target.value))) }))} /></label><label><span>{t('loads.averagePower')}</span><span className="uf"><input inputMode="decimal" value={bulkRange.meanKw} onChange={(event) => setBulkRange((current) => ({ ...current, meanKw: num(event.target.value) }))} /><span className="uf-unit">kW</span></span></label><label><span>{t('loads.peakPower')}</span><span className="uf"><input inputMode="decimal" value={bulkRange.peakKw} onChange={(event) => setBulkRange((current) => ({ ...current, peakKw: num(event.target.value) }))} /><span className="uf-unit">kW</span></span></label></div>
      </Dialog>}


    </div>
  );
}

/** Index du jour le plus consommateur d'une série annuelle. */
function heaviestDayIndex(hourly: readonly { readonly realPower: number }[]): number {
  let best = 0;
  let bestEnergy = -1;
  for (let day = 0; day * 24 + 24 <= hourly.length; day += 1) {
    let energy = 0;
    for (let hour = 0; hour < 24; hour += 1) energy += hourly[day * 24 + hour]!.realPower;
    if (energy > bestEnergy) { bestEnergy = energy; best = day; }
  }
  return best;
}

/**
 * Résumé d'une série annuelle importée.
 *
 * On ne montre pas 8 760 champs : on dit ce que la série contient, on désigne
 * le jour qui dimensionne, et on laisse une porte de sortie vers la journée
 * type pour qui voudrait reprendre la main à la saisie.
 */
function AnnualSeriesPanel({ hourly, onReduceToDay }: {
  readonly hourly: readonly { readonly hour: number; readonly realPower: number; readonly peakPower: number }[];
  readonly onReduceToDay: () => void;
}) {
  const t = useT();
  const totalKwh = hourly.reduce((total, point) => total + point.realPower, 0);
  const peakKw = hourly.reduce((max, point) => Math.max(max, point.peakPower), 0);
  const day = heaviestDayIndex(hourly);
  const dayKwh = Array.from({ length: 24 }, (_, hour) => hourly[day * 24 + hour]?.realPower ?? 0).reduce((total, value) => total + value, 0);
  const date = new Date(Date.UTC(2021, 0, 1 + day));
  return <div className="annual-series-panel">
    <div className="out-grid">
      <div className="out-cell is-lead"><span className="out-lbl">{t('loads.annualTotal')}</span><span className="out-val"><b>{fmt(totalKwh, 0)}</b><span className="unit">{t('loads2.kwhAn')}</span></span></div>
      <div className="out-cell"><span className="out-lbl">{t('loads.annualPeak')}</span><span className="out-val"><b>{fmt(peakKw, 2)}</b><span className="unit">kW</span></span></div>
      <div className="out-cell"><span className="out-lbl">{t('loads.annualDesignDay')}</span><span className="out-val"><b>{date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' })}</b></span><span className="out-note">{fmt(dayKwh, 1)} kWh</span></div>
      <div className="out-cell"><span className="out-lbl">{t('loads.annualHours')}</span><span className="out-val"><b>{fmt(hourly.length, 0)}</b><span className="unit">h</span></span></div>
    </div>
    <p className="label">{t('loads.annualHint')}</p>
    <button className="btn" onClick={onReduceToDay}>{t('loads.annualReduce')}</button>
  </div>;
}

function clampHour(value: number): number { return Math.min(23, Math.max(0, Math.round(value))); }

async function importHourlyCsv(
  file: File,
  mutate: (change: (profile: NamedProfile) => void) => void,
  notify: (toast: Omit<Toast, 'id'>) => void,
): Promise<void> {
  try {
    const lines = (await file.text()).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    // Une première ligne d'en-têtes est fréquente dans les exports de
    // compteur : elle ne se lit pas comme une heure, on la laisse tomber.
    const parsed = lines.flatMap((line) => {
      const columns = line.split(/[;,\t]/u).map((value) => value.trim().replace(',', '.'));
      const hour = Number(columns[0]);
      const meanKw = Number(columns[1]);
      const peakKw = columns[2] === undefined || columns[2] === '' ? meanKw : Number(columns[2]);
      return Number.isInteger(hour) && hour >= 0 && hour <= 8_759 && Number.isFinite(meanKw) && meanKw >= 0 && Number.isFinite(peakKw) && peakKw >= meanKw
        ? [{ hour, meanKw, peakKw }] : [];
    });
    const size = parsed.length === 8_760 ? 8_760 : 24;
    if (parsed.length !== size || new Set(parsed.map((row) => row.hour)).size !== size) throw new Error('INVALID_HOURLY_CSV');
    if (parsed.some((row) => row.hour >= size)) throw new Error('INVALID_HOURLY_CSV');
    mutate((profile) => {
      profile.hourly = Array.from({ length: size }, (_, hour) => ({ hour, realPower: 0, peakPower: 0 }));
      for (const row of parsed) { profile.hourly[row.hour]!.realPower = row.meanKw; profile.hourly[row.hour]!.peakPower = row.peakKw; }
    });
    notify({
      kind: 'success',
      title: tr('loads2.profilCsvImporte'),
      detail: size === 8_760 ? tr('loads2.8760HeuresAnnee') : tr('loads2.24HeuresPuissanceMoyenne'),
    });
  } catch {
    notify({ kind: 'error', title: tr('loads2.importCsvRefuse'), detail: tr('loads2.attendu24LignesJournee') });
  }
}

async function importHourlyWorkbook(
  file: File,
  mutate: (change: (profile: NamedProfile) => void) => void,
  notify: (toast: Omit<Toast, 'id'>) => void,
): Promise<void> {
  const result = inspectHourlyProfileWorkbook(await file.arrayBuffer());
  if (result.status === 'invalid') {
    notify({ kind: 'error', title: tr('loads2.importRefuse'), detail: result.issues.slice(0, 3).map((issue) => `${issue.cellAddress || issue.columnName}: ${issue.message}`).join(' · ') });
    return;
  }
  const size = result.candidate.length;
  mutate((profile) => {
    profile.hourly = Array.from({ length: size }, (_, hour) => ({ hour, realPower: 0, peakPower: 0 }));
    result.candidate.forEach((point) => { profile.hourly[point.hourIndex] = { hour: point.hourIndex, realPower: point.activePowerKw, peakPower: point.peakPowerKw ?? point.activePowerKw }; });
  });
  notify({
    kind: 'success',
    title: tr('loads2.profilHoraireImporte'),
    detail: size === 8_760 ? tr('loads2.8760HeuresValidees') : tr('loads2.24HeuresValideesEt'),
  });
}
