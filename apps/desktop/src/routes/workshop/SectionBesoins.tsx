import { useMemo, useRef, useState } from 'react';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useUi } from '../../store/ui';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import type { LoadCompositionView, NamedProfile } from '../../app/models/projectView';
import { activeLoadSource, inventoryDirectProfile, isLoadEmpty, type LoadSourceKey } from '../../app/models/loadSources';
import { useCalculationState } from '../../app/CalculationProvider';
import { exportHourlyProfileWorkbook } from '../../app/services/loadWorkbooks';
import { saveFile } from '../../app/platform/files';
import { buildAnnualLoadPresentationResult } from '../../app/models/annualLoadPresentation';
import { fill, useT } from '../../i18n';
import { AppliancesTable } from './loads/AppliancesTable';
import { TypicalDayEditor } from './loads/TypicalDayEditor';
import { AnnualImportPanel } from './loads/AnnualImportPanel';
import { ComposedSummary } from './loads/ComposedSummary';
import { MeterForm, emptyMeter } from './loads/MeterForm';
import { LoadSourceBar, LoadSourceChooser } from './loads/LoadSourcePicker';
import { readHourlyFile } from './loads/hourlyImport';
import { ComposedProfilesDialog } from './ComposedProfilesDialog';
import { AnnualLoadChart } from './AnnualLoadChart';

const BRIDGE_KEY = 'kya-sol-design.bridge-dismissed';

function bridgeDismissed(projectId: string): boolean {
  try { return (JSON.parse(window.localStorage.getItem(BRIDGE_KEY) ?? '[]') as string[]).includes(projectId); } catch { return false; }
}
function dismissBridge(projectId: string): void {
  try {
    const list = JSON.parse(window.localStorage.getItem(BRIDGE_KEY) ?? '[]') as string[];
    window.localStorage.setItem(BRIDGE_KEY, JSON.stringify([...new Set([...list, projectId])]));
  } catch { /* préférence locale seulement */ }
}

/**
 * Étape Besoins. L'utilisateur part de ce dont il dispose ; cinq sources restent ensuite à portée
 * de clic, chacune avec ses données : changer de source ne supprime rien, seule la source active
 * alimente les calculs (spec 011, D1).
 */
export function SectionBesoins() {
  const t = useT();
  const project = useProject();
  const update = useProjects((s) => s.update);
  const notify = useUi((s) => s.notify);
  const [composer, setComposer] = useState<{ initial: LoadCompositionView | null } | null>(null);
  const [chosen, setChosen] = useState(false);
  const [bridgeHidden, setBridgeHidden] = useState(() => bridgeDismissed(project.id));
  const [bulkEditor, setBulkEditor] = useState(false);
  const [bulkRange, setBulkRange] = useState({ start: 8, end: 18, meanKw: 0, peakKw: 0 });
  const importRef = useRef<HTMLInputElement>(null);

  const profile = project.load.profiles.find((p) => p.id === project.load.activeProfileId)!;
  const active = activeLoadSource(project);
  const showChooser = !chosen && isLoadEmpty(project);

  const solarCalculation = useCalculationState<SolarResourceAnalysisOutputV1>(project.id, 'solar-resource', project.updatedAt);
  const solarOutput = solarCalculation.status === 'ready' ? solarCalculation.envelope.output : null;
  // La série annuelle déroule 8 760 heures : mémorisée, pas recalculée à chaque frappe.
  const annual = useMemo(() => buildAnnualLoadPresentationResult(project, solarOutput), [project, solarOutput]);

  const mutateProfile = (fn: (p: NamedProfile) => void) => update((draft) => {
    const p = draft.load.profiles.find((x) => x.id === draft.load.activeProfileId);
    if (p) fn(p);
  });

  const selectSource = (key: LoadSourceKey) => {
    if (key === 'composed' && project.load.composition === null) {
      setComposer({ initial: null });
      return;
    }
    setChosen(true);
    if (key === active) return;
    update((draft) => {
      if (key === 'composed') { draft.load.activeMode = 'composed'; return; }
      draft.load.activeMode = 'simple';
      const target = draft.load.profiles.find((x) => x.id === draft.load.activeProfileId);
      if (!target) return;
      target.source = key;
      if (key === 'meter' && target.meter === null) target.meter = emptyMeter();
    });
    notify({ kind: 'info', title: fill(t('loads.source.changedTitle'), { source: t(`loads.source.${key}.tab`) }), detail: t('loads.source.changedDetail') });
  };

  const applyComposition = (composition: LoadCompositionView) => {
    update((draft) => {
      draft.load.activeMode = 'composed';
      draft.load.composition = structuredClone(composition);
      draft.load.granularity = composition.organization;
    });
    setChosen(true);
    setComposer(null);
    notify({ kind: 'success', title: t('loads2.profilsComposesEnregistres'), detail: t('loads2.leCalendrierAnnuelA') });
  };

  /** Année composée pré-remplie depuis l'inventaire : jours ouvrés et week-end partent des appareils. */
  const composeFromInventory = () => {
    const week = inventoryDirectProfile(profile.appliances, { id: 'inventory-workweek', name: t('composed.joursOuvres'), color: '#F99D32' });
    const weekend = inventoryDirectProfile(profile.appliances, { id: 'inventory-weekend', name: t('loads.calendarWeekend'), color: '#2B9C8F' });
    setComposer({
      initial: {
        organization: 'workweek-weekend',
        calendar: {
          version: 2, mode: 'workweek-weekend',
          dayGroups: [{ id: 'workweek', kind: 'workweek', weekdaysIso: [1, 2, 3, 4, 5] }, { id: 'weekend', kind: 'weekend', weekdaysIso: [6, 7] }],
          periods: [{ id: 'annual', name: t('loads.calendarYear'), startMonthDay: '01-01', endMonthDay: '12-31' }],
          assignments: [{ periodId: 'annual', dayGroupId: 'workweek', profileId: week.id }, { periodId: 'annual', dayGroupId: 'weekend', profileId: weekend.id }],
        },
        profiles: [week, weekend],
      },
    });
  };

  const importHourly = async (file: File) => {
    const result = await readHourlyFile(file);
    if (result.status === 'invalid') {
      notify({ kind: 'error', title: t('loads2.importRefuse'), detail: result.detail || t('loads2.attendu24LignesJournee') });
      return;
    }
    const year = result.points.length === 8_760;
    update((draft) => {
      draft.load.activeMode = 'simple';
      const target = draft.load.profiles.find((x) => x.id === draft.load.activeProfileId);
      if (!target) return;
      if (year) { target.annual = result.points.map((point) => ({ ...point })); target.annualSourceName = file.name; target.source = 'annual'; }
      else { target.hourly = result.points.map((point) => ({ ...point })); target.source = 'hourly'; }
    });
    setChosen(true);
    notify({ kind: 'success', title: t('loads2.profilHoraireImporte'), detail: year ? t('loads.importedAsYear') : t('loads.importedAsDay') });
  };

  const exportDay = () => void saveFile({
    suggestedName: 'profil-horaire.xlsx',
    data: new Blob([exportHourlyProfileWorkbook(profile.hourly.map((point) => ({ hourIndex: point.hour, activePowerKw: point.realPower, peakPowerKw: point.peakPower }))).slice().buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filter: { name: 'Excel', extensions: ['xlsx'] },
  });

  const annualKwh = annual.status === 'ready' ? annual.daily.reduce((sum, day) => sum + day.energyKwh, 0) : null;
  const annualPeakKw = annual.status === 'ready' ? Math.max(...annual.daily.map((day) => day.peakKw)) : null;
  const gamma = solarOutput?.gamma.status === 'available' ? solarOutput.gamma.value : null;

  return (
    <div className="sheet">
      <StepHead slug="besoins" aside={showChooser ? undefined : <LoadSourceBar active={active} onChoose={selectSource} />} />
      <input ref={importRef} type="file" accept=".xlsx,.xls,.csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importHourly(file); event.target.value = ''; }} />

      {showChooser ? <LoadSourceChooser onChoose={(key) => { if (key === 'annual') { setChosen(true); selectSource('annual'); importRef.current?.click(); } else selectSource(key); }} /> : <>
        {active === 'equipments' && <>
          <AppliancesTable profile={profile} mutate={mutateProfile} simultaneityNotice={project.load.simultaneityNotice}
            onDismissNotice={() => update((draft) => { draft.load.simultaneityNotice = null; })} />
          {profile.appliances.length > 0 && !bridgeHidden && (
            <div className="alert info bridge" role="note">
              <div><b>{t('loads.bridgeTitle')}</b> {t('loads.bridgeBody')}</div>
              <button type="button" className="btn" onClick={composeFromInventory}>{t('loads.bridgeAction')} →</button>
              <button type="button" className="btn btn-ghost" aria-label={t('g.close')} onClick={() => { dismissBridge(project.id); setBridgeHidden(true); }}>✕</button>
            </div>
          )}
        </>}

        {active === 'hourly' && (
          <section>
            <div className="tbl-title">
              <h2 className="h-sec">{t('loads.source.hourly.tab')}</h2>
              <span className="label">{t('loads.dailySeriesLabel')}</span>
              <span className="sep" />
              <button type="button" className="btn" onClick={() => setBulkEditor(true)}>{t('loads.bulkEdit')}</button>
              <button type="button" className="btn" onClick={() => importRef.current?.click()}>{t('loads.importExcel')}</button>
              <button type="button" className="btn" onClick={exportDay}>{t('loads.exportExcel')}</button>
            </div>
            <TypicalDayEditor hourly={profile.hourly} mutate={(change) => mutateProfile((target) => change(target.hourly))} />
          </section>
        )}

        {active === 'composed' && project.load.composition !== null && (
          <ComposedSummary composition={project.load.composition} annualKwh={annualKwh} peakKw={annualPeakKw} onEdit={() => setComposer({ initial: project.load.composition })} />
        )}

        {active === 'annual' && (
          <section>
            <div className="tbl-title"><h2 className="h-sec">{t('loads.source.annual.tab')}</h2></div>
            <AnnualImportPanel annual={profile.annual} sourceName={profile.annualSourceName}
              onImport={() => importRef.current?.click()}
              onRemove={() => mutateProfile((target) => { target.annual = null; target.annualSourceName = null; })} />
          </section>
        )}

        {active === 'meter' && profile.meter !== null && (
          <MeterForm meter={profile.meter} calculatedShare={gamma} mutate={(change) => mutateProfile((target) => { if (target.meter) change(target.meter); })} />
        )}

        <AnnualLoadChart result={annual} />
      </>}

      {/* Monté à chaque ouverture : la composition de départ (existante ou tirée de l'inventaire) est lue à neuf. */}
      {composer !== null && <ComposedProfilesDialog open initial={composer.initial} inventory={profile.appliances}
        onCancel={() => setComposer(null)} onApply={applyComposition} />}

      {bulkEditor && <Dialog title={t('loads2.editionEnMasseDu')} lead={t('loads2.appliquerUnePuissanceMoyenne')} onClose={() => setBulkEditor(false)} footer={<><button type="button" className="btn btn-ghost" onClick={() => setBulkEditor(false)}>{t('g.cancel')}</button><button type="button" className="btn btn-ok" onClick={() => {
        mutateProfile((target) => {
          target.hourly.forEach((point) => {
            const included = bulkRange.start <= bulkRange.end ? point.hour >= bulkRange.start && point.hour < bulkRange.end : point.hour >= bulkRange.start || point.hour < bulkRange.end;
            if (included) { point.realPower = bulkRange.meanKw; point.peakPower = bulkRange.peakKw > bulkRange.meanKw ? bulkRange.peakKw : null; }
          });
        });
        setBulkEditor(false);
        notify({ kind: 'success', title: t('loads2.profilHoraireMisA'), detail: `${String(bulkRange.start).padStart(2, '0')}–${String(bulkRange.end).padStart(2, '0')}` });
      }}>{t('loads.apply')}</button></>}>
        <div className="form-rows">
          <label><span>{t('loads.startHour')}</span><input type="number" min={0} max={23} value={bulkRange.start} onChange={(event) => setBulkRange((current) => ({ ...current, start: Math.min(23, Math.max(0, Math.round(Number(event.target.value)))) }))} /></label>
          <label><span>{t('loads.endHourExcluded')}</span><input type="number" min={0} max={24} value={bulkRange.end} onChange={(event) => setBulkRange((current) => ({ ...current, end: Math.min(24, Math.max(0, Number(event.target.value))) }))} /></label>
          <label><span>{t('loads.averagePower')}</span><span className="uf"><input inputMode="decimal" value={bulkRange.meanKw} onChange={(event) => setBulkRange((current) => ({ ...current, meanKw: decimal(event.target.value) }))} /><span className="uf-unit">kW</span></span></label>
          <label><span>{t('loads.peakPower')}</span><span className="uf"><input inputMode="decimal" value={bulkRange.peakKw} onChange={(event) => setBulkRange((current) => ({ ...current, peakKw: decimal(event.target.value) }))} /><span className="uf-unit">kW</span></span></label>
        </div>
      </Dialog>}
    </div>
  );
}

function decimal(value: string): number {
  const parsed = Number.parseFloat(value.replace(',', '.').replace(/\s/gu, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
