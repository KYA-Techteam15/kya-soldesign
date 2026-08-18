import { useEffect, useRef, useState, type ChangeEvent, type ComponentProps } from 'react';
import { defaultOperatingFractions, reconcileOperatingFractions, summarizeEquipmentRow, type AioSizingOutputV1, type EquipmentRowSummary } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useUi, type Toast } from '../../store/ui';
import { StepHead } from '../../ui/Flow';
import { fmt } from '../../domain/format';
import { useGridNav } from '../../ui/useGridNav';
import type { Granularity, LoadSource, NamedProfile } from '../../app/models/projectView';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { useT } from '../../i18n';
import { useCatalog } from '../../app/CatalogProvider';
import { OperatingHoursDialog } from './OperatingHoursDialog';
import { Dialog } from '../../ui/Dialog';
import { isDecimalDraft } from '../../app/models/formValues';

const MODES: { key: LoadSource; label: string }[] = [
  /* Chaque onglet nomme la manière dont on renseigne la consommation, pas la
     forme du résultat : « Profil horaire » décrivait ce qu'on obtient, alors
     que le choix porte sur ce qu'on saisit. */
  { key: 'equipments', label: 'Recenser les appareils' },
  { key: 'hourly', label: 'Saisir heure par heure' },
  { key: 'meter', label: 'Partir de la facture' },
];

const GRANULARITIES: { key: Granularity; label: string; n: string; hint: string; implemented: boolean }[] = [
  { key: 'annual', label: 'Annuel', n: '1', hint: 'Un seul profil pour toute l’année', implemented: true },
  { key: 'weekly', label: 'Hebdomadaire', n: '2', hint: 'Semaine et week-end séparés', implemented: false },
  { key: 'daily', label: 'Journalier', n: '7', hint: 'Un profil par jour de la semaine', implemented: false },
  { key: 'monthly', label: 'Mensuel', n: '12', hint: 'Un profil par mois', implemented: false },
  { key: 'periodic', label: 'Périodes', n: 'N', hint: 'Périodes saisonnières personnalisées', implemented: false },
  { key: 'combined', label: 'Combiné', n: '×', hint: 'Hebdomadaire × périodes, jusqu’à 12 profils', implemented: false },
];

function DraftNumberInput({
  value,
  onCommit,
  format = (number) => String(number),
  nullable = false,
  inputMode = 'decimal',
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange'> & {
  readonly value: number | null;
  readonly onCommit: (value: number | null) => void;
  readonly format?: (value: number) => string;
  readonly nullable?: boolean;
}) {
  const [draft, setDraft] = useState(() => value === null ? '' : format(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(value === null ? '' : format(value));
  }, [focused, format, value]);

  const commitDraft = (raw: string) => {
    if (raw.trim() === '') {
      if (nullable) onCommit(null);
      return;
    }
    if (!isDecimalDraft(raw)) return;
    const parsed = Number(raw.replace(',', '.'));
    if (Number.isFinite(parsed)) onCommit(parsed);
  };

  return <input
    {...props}
    inputMode={inputMode}
    value={draft}
    onFocus={() => setFocused(true)}
    onChange={(event: ChangeEvent<HTMLInputElement>) => {
      const raw = event.target.value;
      if (!isDecimalDraft(raw)) return;
      setDraft(raw);
      commitDraft(raw);
    }}
    onBlur={() => {
      commitDraft(draft);
      setFocused(false);
    }}
  />;
}

export function SectionBesoins() {
  const t = useT();
  const project = useProject();
  const update = useProjects((s) => s.update);
  const notify = useUi((s) => s.notify);
  const { loadProfiles } = useCatalog();
  const [showGranularity, setShowGranularity] = useState(false);
  const [filter, setFilter] = useState('');
  const [hoursEditor, setHoursEditor] = useState(false);
  const [bulkEditor, setBulkEditor] = useState(false);
  const [bulkRange, setBulkRange] = useState({ start: 8, end: 18, meanKw: 0, peakKw: 0 });
  const hourlyImportRef = useRef<HTMLInputElement>(null);

  const profile = project.load.profiles.find(
    (p) => p.id === project.load.activeProfileId,
  )!;
  const calculation = useCalculationState<AioSizingOutputV1>(project.id, 'sizing', project.updatedAt);

  const mutateProfile = (fn: (p: NamedProfile) => void) =>
    update((draft) => {
      const p = draft.load.profiles.find((x) => x.id === draft.load.activeProfileId);
      if (p) fn(p);
    });

  const num = (v: string) => {
    const parsed = Number.parseFloat(v.replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const nullableNum = (value: string): number | null => value.trim() === '' ? null : num(value);
  const duration = (value: string): number => Math.min(24, Math.max(0, num(value)));

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
      equipments: 'La liste d’appareils pilote désormais le calcul.',
      hourly: 'Le profil horaire saisi est désormais la source active.',
      meter: 'L’estimation depuis la facture pilote désormais le calcul.',
    };
    notify({ kind: 'info', title: 'Source de calcul changée', detail: said[next] });
  };

  const addClassic = () =>
    mutateProfile((p) =>
      p.classic.push({
        id: `c-${Date.now()}`,
        name: 'Nouvel appareil',
        qty: 1,
        unitPower: 100,
        yield: 0.9,
        simultaneity: 1,
        operatingFractions: defaultOperatingFractions(4),
        opHours: 4,
      }),
    );
  const addInductive = () =>
    mutateProfile((p) =>
      p.inductive.push({
        id: `i-${Date.now()}`,
        name: 'Nouveau moteur',
        qty: 1,
        unitPower: 500,
        yield: 0.85,
        simultaneity: 1,
        startupCoef: 3,
        operatingFractions: defaultOperatingFractions(2),
        opHours: 2,
      }),
    );

  const CLASSIC_COLS = ['name', 'qty', 'unitPower', 'yield', 'opHours'] as const;
  const INDUCT_COLS = ['name', 'qty', 'unitPower', 'yield', 'startupCoef', 'opHours'] as const;

  const classicGrid = useGridNav({
    rowCount: profile.classic.length,
    colCount: CLASSIC_COLS.length,
    addRow: addClassic,
    getCell: (r, c) => String(profile.classic[r]?.[CLASSIC_COLS[c]] ?? ''),
    setCell: (r, c, v) =>
      mutateProfile((p) => {
        const row = p.classic[r];
        if (!row) return;
        const key = CLASSIC_COLS[c];
        if (key === 'name') row.name = v;
        else if (key === 'yield') row[key] = nullableNum(v);
        else if (key === 'opHours') {
          row.opHours = duration(v);
          row.operatingFractions = reconcileOperatingFractions(row.opHours, row.operatingFractions);
        } else (row[key] as number) = num(v);
      }),
  });

  const inductGrid = useGridNav({
    rowCount: profile.inductive.length,
    colCount: INDUCT_COLS.length,
    addRow: addInductive,
    getCell: (r, c) => String(profile.inductive[r]?.[INDUCT_COLS[c]] ?? ''),
    setCell: (r, c, v) =>
      mutateProfile((p) => {
        const row = p.inductive[r];
        if (!row) return;
        const key = INDUCT_COLS[c];
        if (key === 'name') row.name = v;
        else if (key === 'yield' || key === 'startupCoef') row[key] = nullableNum(v);
        else if (key === 'opHours') {
          row.opHours = duration(v);
          row.operatingFractions = reconcileOperatingFractions(row.opHours, row.operatingFractions);
        } else (row[key] as number) = num(v);
      }),
  });

  const needle = filter.trim().toLowerCase();
  const keep = (name: string) => !needle || name.toLowerCase().includes(needle);
  const visibleClassic = profile.classic
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => keep(e.name));
  const visibleInductive = profile.inductive
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => keep(e.name));

  const classicSummary = summarizeRows(profile.classic.map((item) => summarizeEquipmentRow({ id: item.id, label: item.name, quantity: item.qty, usefulPowerW: item.unitPower, efficiencyRatio: item.yield, simultaneityRatio: item.simultaneity, hourlyOperatingFractions: item.operatingFractions, startupPowerMultiplier: null })));
  const inductiveSummary = summarizeRows(profile.inductive.map((item) => summarizeEquipmentRow({ id: item.id, label: item.name, quantity: item.qty, usefulPowerW: item.unitPower, efficiencyRatio: item.yield, simultaneityRatio: item.simultaneity, hourlyOperatingFractions: item.operatingFractions, startupPowerMultiplier: item.startupCoef })));
  const allSummary = classicSummary === null || inductiveSummary === null ? null : {
    installedUsefulPowerW: classicSummary.installedUsefulPowerW + inductiveSummary.installedUsefulPowerW,
    calledElectricalPowerW: classicSummary.calledElectricalPowerW + inductiveSummary.calledElectricalPowerW,
    dailyEnergyWh: classicSummary.dailyEnergyWh + inductiveSummary.dailyEnergyWh,
  };

  return (
    <div className="sheet">
      <StepHead
        slug="besoins"
        aside={
          <>
            <div className="seg" role="tablist">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={profile.source === m.key}
                  onClick={() => switchMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => setShowGranularity(true)}>
              Profils : {GRANULARITIES.find((g) => g.key === project.load.granularity)?.label}
            </button>
          </>
        }
      />

      {profile.source === 'equipments' && (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <section>
            <div className="tbl-title">
              <h2 className="h-sec">{t('loads.classic')}</h2>
              <span className="label">
                {profile.classic.length} lignes
                {filter && ` · ${visibleClassic.length} filtrées`}
              </span>
              <input
                /* Champ de filtre : il attend une frappe, pas un clic. */
                className="hdr-search"
                style={{ width: 160 }}
                placeholder="Filtrer par nom…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span className="sep" />
              <span className="label">colonnes grisées = calculées</span>
              <button
                className="btn"
                onClick={() =>
                  notify({
                    kind: 'info',
                    title: 'Collage depuis Excel',
                    detail:
                      'Copiez une plage dans le tableur, cliquez une cellule du tableau, puis Ctrl V. Les lignes manquantes sont créées.',
                  })
                }
              >
                Aide au collage
              </button>
            </div>
            <div
              className="tbl-wrap"
              ref={classicGrid.ref}
              onKeyDown={classicGrid.onKeyDown}
              onPaste={classicGrid.onPaste}
            >
              <table className="tbl t-classic">
                <thead>
                  <tr>
                    <th>{t('loads.name')}</th>
                    <th>{t('loads.quantity')}</th>
                    <th>{t('loads.unitPower')}<span className="unit">W</span></th>
                    <th>{t('loads.efficiency')}</th>
                    <th>{t('loads.hours')}</th>
                    <th className="derived">{t('loads.totalPower')}<span className="unit">W</span></th>
                    <th className="derived">{t('loads.realPower')}<span className="unit">W</span></th>
                    <th className="derived">{t('loads.totalEnergy')}<span className="unit">Wh</span></th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleClassic.map(({ e, i }) => {
                    const line = summarizeEquipmentRow({ id: e.id, label: e.name, quantity: e.qty, usefulPowerW: e.unitPower, efficiencyRatio: e.yield, simultaneityRatio: e.simultaneity, hourlyOperatingFractions: e.operatingFractions, startupPowerMultiplier: null });
                    return (
                      <tr key={e.id}>
                        <td className="name">
                          <input className="cell-in" data-r={i} data-c={0} aria-label="Nom" value={e.name}
                            onChange={(ev) => mutateProfile((p) => { p.classic[i].name = ev.target.value; })} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={1} aria-label="Quantité" value={e.qty}
                            inputMode="numeric" onCommit={(value) => { if (value !== null && Number.isInteger(value) && value >= 1) mutateProfile((p) => { p.classic[i].qty = value; }); }} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={2} aria-label="Puissance unitaire" value={e.unitPower}
                            onCommit={(value) => { if (value !== null) mutateProfile((p) => { p.classic[i].unitPower = Math.max(0, value); }); }} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={3} aria-label="Rendement" nullable value={e.yield}
                            format={(value) => fmt(value, 2)} onCommit={(value) => { if (value === null || (value > 0 && value <= 1)) mutateProfile((p) => { p.classic[i].yield = value; }); }} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={4} aria-label="Heures d'usage" value={e.opHours}
                            format={(value) => fmt(value, value % 1 ? 2 : 0)} onCommit={(value) => { if (value !== null) mutateProfile((p) => { const row = p.classic[i]; row.opHours = duration(String(value)); row.operatingFractions = reconcileOperatingFractions(row.opHours, row.operatingFractions); }); }} />
                        </td>
                        <td className="derived num">{line === null ? '—' : fmt(line.installedUsefulPowerW, 0)}</td>
                        <td className="derived num">{line === null ? '—' : fmt(line.calledElectricalPowerW, 0)}</td>
                        <td className="derived num">{line === null ? '—' : fmt(line.dailyEnergyWh, 0)}</td>
                        <td>
                          <button className="rowdel" title="Supprimer la ligne"
                            onClick={() => mutateProfile((p) => { p.classic.splice(i, 1); })}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>{t('loads.classicSubtotal')}</td>
                    <td className="num">{classicSummary === null ? '—' : fmt(classicSummary.installedUsefulPowerW, 0)}</td>
                    <td className="num">{classicSummary === null ? '—' : fmt(classicSummary.calledElectricalPowerW, 0)}</td>
                    <td className="num">{classicSummary === null ? '—' : fmt(classicSummary.dailyEnergyWh, 0)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <div className="addrow">
                <button
                  className="btn"
                  onClick={addClassic}
                >
                  + Ajouter une ligne
                </button>
                <span className="sep" />
                <span className="kbd">Entrée</span> nouvelle ligne ·{' '}
                <span className="kbd">Ctrl D</span> recopier vers le bas ·{' '}
                <span className="kbd">Ctrl V</span> coller une plage Excel
              </div>
            </div>
          </section>

          <section>
            <div className="tbl-title">
              <h2 className="h-sec">{t('loads.inductive')}</h2>
              <span className="label">
                {profile.inductive.length} lignes
                {filter && ` · ${visibleInductive.length} filtrées`} · coefficient de
                démarrage appliqué à la pointe
              </span>
            </div>
            <div
              className="tbl-wrap"
              ref={inductGrid.ref}
              onKeyDown={inductGrid.onKeyDown}
              onPaste={inductGrid.onPaste}
            >
              <table className="tbl t-induct">
                <thead>
                  <tr>
                    <th>{t('loads.name')}</th>
                    <th>{t('loads.quantity')}</th>
                    <th>{t('loads.unitPower')}<span className="unit">W</span></th>
                    <th>{t('loads.efficiency')}</th>
                    <th>{t('loads.startingCoefficient')}</th>
                    <th>{t('loads.hours')}</th>
                    <th className="derived">{t('loads.totalPower')}<span className="unit">W</span></th>
                    <th className="derived">{t('loads.realPower')}<span className="unit">W</span></th>
                    <th className="derived">{t('loads.totalEnergy')}<span className="unit">Wh</span></th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleInductive.map(({ e, i }) => {
                    const line = summarizeEquipmentRow({ id: e.id, label: e.name, quantity: e.qty, usefulPowerW: e.unitPower, efficiencyRatio: e.yield, simultaneityRatio: e.simultaneity, hourlyOperatingFractions: e.operatingFractions, startupPowerMultiplier: e.startupCoef });
                    return (
                      <tr key={e.id}>
                        <td className="name">
                          <input className="cell-in" data-r={i} data-c={0} aria-label="Nom" value={e.name}
                            onChange={(ev) => mutateProfile((p) => { p.inductive[i].name = ev.target.value; })} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={1} aria-label="Quantité" value={e.qty}
                            inputMode="numeric" onCommit={(value) => { if (value !== null && Number.isInteger(value) && value >= 1) mutateProfile((p) => { p.inductive[i].qty = value; }); }} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={2} aria-label="Puissance unitaire" value={e.unitPower}
                            onCommit={(value) => { if (value !== null) mutateProfile((p) => { p.inductive[i].unitPower = Math.max(0, value); }); }} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={3} aria-label="Rendement" nullable value={e.yield}
                            format={(value) => fmt(value, 2)} onCommit={(value) => { if (value === null || (value > 0 && value <= 1)) mutateProfile((p) => { p.inductive[i].yield = value; }); }} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={4} aria-label="Coefficient de démarrage" nullable value={e.startupCoef}
                            format={(value) => fmt(value, 1)} onCommit={(value) => { if (value === null || value >= 1) mutateProfile((p) => { p.inductive[i].startupCoef = value; }); }} />
                        </td>
                        <td>
                          <DraftNumberInput className="cell-in" data-r={i} data-c={5} aria-label="Heures d'usage" value={e.opHours}
                            format={(value) => fmt(value, value % 1 ? 2 : 0)} onCommit={(value) => { if (value !== null) mutateProfile((p) => { const row = p.inductive[i]; row.opHours = duration(String(value)); row.operatingFractions = reconcileOperatingFractions(row.opHours, row.operatingFractions); }); }} />
                        </td>
                        <td className="derived num">{line === null ? '—' : fmt(line.installedUsefulPowerW, 0)}</td>
                        <td className="derived num">{line === null ? '—' : fmt(line.calledElectricalPowerW, 0)}</td>
                        <td className="derived num">{line === null ? '—' : fmt(line.dailyEnergyWh, 0)}</td>
                        <td>
                          <button className="rowdel" title="Supprimer la ligne"
                            onClick={() => mutateProfile((p) => { p.inductive.splice(i, 1); })}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6}>{t('loads.inductiveSubtotal')}</td>
                    <td className="num">{inductiveSummary === null ? '—' : fmt(inductiveSummary.installedUsefulPowerW, 0)}</td>
                    <td className="num">{inductiveSummary === null ? '—' : fmt(inductiveSummary.calledElectricalPowerW, 0)}</td>
                    <td className="num">{inductiveSummary === null ? '—' : fmt(inductiveSummary.dailyEnergyWh, 0)}</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={6}>{t('loads.total')}</td>
                    <td className="num">{allSummary === null ? '—' : fmt(allSummary.installedUsefulPowerW, 0)}</td>
                    <td className="num">{allSummary === null ? '—' : fmt(allSummary.calledElectricalPowerW, 0)}</td>
                    <td className="num">{allSummary === null ? '—' : fmt(allSummary.dailyEnergyWh, 0)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <div className="addrow">
                <button
                  className="btn"
                  onClick={addInductive}
                >
                  + Ajouter une ligne
                </button>
                <span className="sep" />
                <button className="btn" disabled={profile.classic.length + profile.inductive.length === 0} onClick={() => setHoursEditor(true)}>
                  Ajuster les heures…
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {profile.source === 'hourly' && (
        <section>
          <div className="tbl-title">
            <h2 className="h-sec">{t('loads.hourly')}</h2>
            <span className="label">puissance moyenne et pointe, kW · 24 valeurs</span>
            <span className="sep" />
            <button className="btn" onClick={() => setBulkEditor(true)}>
              Édition en masse…
            </button>
            <input ref={hourlyImportRef} type="file" accept=".csv,text/csv" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importHourlyCsv(file, mutateProfile, notify); event.target.value = ''; }} />
            <button className="btn" onClick={() => hourlyImportRef.current?.click()}>{t('loads.importCsv')}</button>
          </div>
          {[0, 12].map((offset) => (
            <div className="hourgrid" key={offset} style={{ marginBottom: 'var(--sp-3)' }}>
              {profile.hourly.slice(offset, offset + 12).map((h) => (
                <div key={h.hour}>
                  <span>{String(h.hour).padStart(2, '0')}</span>
                  <DraftNumberInput
                    className="cell-in"
                    aria-label={`Puissance à ${h.hour} h`}
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
          <div className="tbl-title" style={{ marginTop: 'var(--sp-4)' }}><h2 className="h-sec">{t('loads.hourlyPeak')}</h2><span className="label">kW · chaque valeur doit être ≥ à la puissance moyenne</span></div>
          {[0, 12].map((offset) => <div className="hourgrid" key={`peak-${offset}`} style={{ marginBottom: 'var(--sp-3)' }}>{profile.hourly.slice(offset, offset + 12).map((h) => <div key={h.hour}><span>{String(h.hour).padStart(2, '0')}</span><DraftNumberInput className="cell-in" aria-label={`Puissance de pointe à ${h.hour} h`} value={h.peakPower} format={(value) => fmt(value, 2)} onCommit={(value) => { if (value !== null) mutateProfile((p) => { p.hourly[h.hour].peakPower = Math.max(p.hourly[h.hour].realPower, value); }); }} /></div>)}</div>)}
          <CapabilityNotice capability="sizing" state={calculation} compact />
        </section>
      )}

      {profile.source === 'meter' && profile.meter && (
        <section>
          <div className="tbl-title">
            <h2 className="h-sec">Estimation depuis la facture d'électricité</h2>
          </div>
          <div className="form-rows">
            <div className="alert" role="note" style={{ gridColumn: '1 / -1' }}>
              <b>{t('loads.currentCalculation')}</b> {t('loads.meterCalculationNote')}
            </div>
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
          </div>
        </section>
      )}

      {showGranularity && (
        <div className="scrim" onClick={() => setShowGranularity(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>{t('loads.granularity')}</header>
            <div className="body">
              <div className="proj-list">
                {GRANULARITIES.map((g) => (
                  <button
                    key={g.key}
                    className="proj-row"
                    disabled={!g.implemented}
                    onClick={() => {
                      if (!g.implemented) return;
                      update((d) => { d.load.granularity = g.key; });
                      setShowGranularity(false);
                      notify({ kind: 'success', title: `Granularité : ${g.label}` });
                    }}
                  >
                    <span>
                      <b>{g.label}</b>
                      <small>{g.hint} · {g.implemented ? 'disponible' : 'indisponible dans cette version'}</small>
                    </span>
                    <span className="when">{g.n}</span>
                    <span className="badge">
                      {project.load.granularity === g.key ? 'actif' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <footer>
              <button className="btn btn-ghost" onClick={() => setShowGranularity(false)}>
                {t('g.close')}
              </button>
            </footer>
          </div>
        </div>
      )}

      {bulkEditor && <Dialog title="Édition en masse du profil horaire" lead="appliquer une puissance moyenne et une pointe sur une plage" onClose={() => setBulkEditor(false)} footer={<><button className="btn btn-ghost" onClick={() => setBulkEditor(false)}>{t('g.cancel')}</button><button className="btn btn-ok" onClick={() => { mutateProfile((target) => { target.hourly.forEach((point) => { const included = bulkRange.start <= bulkRange.end ? point.hour >= bulkRange.start && point.hour < bulkRange.end : point.hour >= bulkRange.start || point.hour < bulkRange.end; if (included) { point.realPower = bulkRange.meanKw; point.peakPower = Math.max(bulkRange.meanKw, bulkRange.peakKw); } }); }); setBulkEditor(false); notify({ kind: 'success', title: 'Profil horaire mis à jour', detail: `${String(bulkRange.start).padStart(2, '0')} h → ${String(bulkRange.end).padStart(2, '0')} h` }); }}>{t('loads.apply')}</button></>}>
        <div className="form-rows"><label><span>{t('loads.startHour')}</span><input type="number" min={0} max={23} value={bulkRange.start} onChange={(event) => setBulkRange((current) => ({ ...current, start: clampHour(Number(event.target.value)) }))} /></label><label><span>{t('loads.endHourExcluded')}</span><input type="number" min={0} max={24} value={bulkRange.end} onChange={(event) => setBulkRange((current) => ({ ...current, end: Math.min(24, Math.max(0, Number(event.target.value))) }))} /></label><label><span>{t('loads.averagePower')}</span><span className="uf"><input inputMode="decimal" value={bulkRange.meanKw} onChange={(event) => setBulkRange((current) => ({ ...current, meanKw: num(event.target.value) }))} /><span className="uf-unit">kW</span></span></label><label><span>{t('loads.peakPower')}</span><span className="uf"><input inputMode="decimal" value={bulkRange.peakKw} onChange={(event) => setBulkRange((current) => ({ ...current, peakKw: num(event.target.value) }))} /><span className="uf-unit">kW</span></span></label></div>
      </Dialog>}

      {hoursEditor && <OperatingHoursDialog
        items={[...profile.classic, ...profile.inductive].map((row) => ({ id: row.id, name: row.name, durationHours: row.opHours, values: row.operatingFractions }))}
        onClose={() => setHoursEditor(false)}
        onApply={(valuesById) => {
          mutateProfile((target) => {
            [...target.classic, ...target.inductive].forEach((row) => {
              const values = valuesById.get(row.id);
              if (values) row.operatingFractions = [...values];
            });
          });
          setHoursEditor(false);
        }}
      />}

    </div>
  );
}

function summarizeRows(rows: readonly (EquipmentRowSummary | null)[]): EquipmentRowSummary | null {
  if (rows.some((row) => row === null)) return null;
  return rows.reduce<EquipmentRowSummary>((total, row) => ({
    installedUsefulPowerW: total.installedUsefulPowerW + row!.installedUsefulPowerW,
    calledElectricalPowerW: total.calledElectricalPowerW + row!.calledElectricalPowerW,
    dailyEnergyWh: total.dailyEnergyWh + row!.dailyEnergyWh,
  }), { installedUsefulPowerW: 0, calledElectricalPowerW: 0, dailyEnergyWh: 0 });
}

function clampHour(value: number): number { return Math.min(23, Math.max(0, Math.round(value))); }

async function importHourlyCsv(
  file: File,
  mutate: (change: (profile: NamedProfile) => void) => void,
  notify: (toast: Omit<Toast, 'id'>) => void,
): Promise<void> {
  try {
    const lines = (await file.text()).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
    const parsed = lines.flatMap((line) => {
      const columns = line.split(/[;,\t]/u).map((value) => value.trim().replace(',', '.'));
      const hour = Number(columns[0]);
      const meanKw = Number(columns[1]);
      const peakKw = columns[2] === undefined ? meanKw : Number(columns[2]);
      return Number.isInteger(hour) && hour >= 0 && hour <= 23 && Number.isFinite(meanKw) && meanKw >= 0 && Number.isFinite(peakKw) && peakKw >= meanKw
        ? [{ hour, meanKw, peakKw }] : [];
    });
    if (parsed.length !== 24 || new Set(parsed.map((row) => row.hour)).size !== 24) throw new Error('INVALID_HOURLY_CSV');
    mutate((profile) => { for (const row of parsed) { profile.hourly[row.hour]!.realPower = row.meanKw; profile.hourly[row.hour]!.peakPower = row.peakKw; } });
    notify({ kind: 'success', title: 'Profil CSV importé', detail: '24 heures · puissance moyenne et pointe contrôlées.' });
  } catch {
    notify({ kind: 'error', title: 'Import CSV refusé', detail: 'Attendu : 24 lignes uniques « heure; moyenne_kW; pointe_kW », avec pointe ≥ moyenne.' });
  }
}
