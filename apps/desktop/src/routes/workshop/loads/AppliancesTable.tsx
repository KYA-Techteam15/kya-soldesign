import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { defaultOperatingFractions, equipmentStartupPeakW, resizeOperatingSchedule, summarizeEquipmentRow, type EquipmentScheduleRow } from '@ksd/engine';
import type { ApplianceView, NamedProfile } from '../../../app/models/projectView';
import { formatHourBlocks, selectedHours } from '../../../app/models/operatingHours';
import { exportEquipmentWorkbook, inspectEquipmentWorkbook } from '../../../app/services/loadWorkbooks';
import { saveFile } from '../../../app/platform/files';
import { fmt } from '../../../domain/format';
import { fill, useT } from '../../../i18n';
import { useUi } from '../../../store/ui';
import { useGridNav } from '../../../ui/useGridNav';
import { HoursPopover } from '../hours/HoursPopover';
import { HoursPlanner } from '../hours/HoursPlanner';
import { HoursScale, HoursStrip } from '../hours/HoursStrip';
import { DraftNumberInput } from './DraftNumberInput';

const COLS = ['name', 'qty', 'unitPower', 'yield', 'opHours', 'startupCoef'] as const;

export const toScheduleRow = (row: ApplianceView): EquipmentScheduleRow => ({
  id: row.id, label: row.name, quantity: row.qty, usefulPowerW: row.unitPower, efficiencyRatio: row.yield,
  hourlyOperatingFractions: row.operatingFractions, startupPowerMultiplier: row.startupCoef > 1 ? row.startupCoef : null,
});

/**
 * Tableau unique des appareils. Le coefficient de démarrage vaut 1 pour une charge classique ;
 * tout autre coefficient rend l'appareil inductif. La case « Inductif » peut aussi être cochée à
 * la main : avec un coefficient de 1, celui-ci reste à préciser.
 */
export function AppliancesTable({ profile, mutate, simultaneityNotice, onDismissNotice }: {
  readonly profile: NamedProfile;
  readonly mutate: (change: (profile: NamedProfile) => void) => void;
  readonly simultaneityNotice: readonly string[] | null;
  readonly onDismissNotice: () => void;
}) {
  const t = useT();
  const notify = useUi((state) => state.notify);
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState<{ id: string; anchor: DOMRect } | null>(null);
  const [hover, setHover] = useState<{ id: string; anchor: DOMRect } | null>(null);
  const [planner, setPlanner] = useState(false);
  const hoverTimer = useRef<number | undefined>(undefined);
  const importRef = useRef<HTMLInputElement>(null);
  const rows = profile.appliances;

  const setRow = (index: number, change: (row: ApplianceView) => void) => mutate((target) => { const row = target.appliances[index]; if (row) change(row); });
  const setDuration = (row: ApplianceView, value: number) => {
    row.opHours = Math.min(24, Math.max(0, value));
    row.operatingFractions = resizeOperatingSchedule(row.opHours, row.operatingFractions);
  };
  const setCoef = (row: ApplianceView, value: number) => {
    row.startupCoef = Math.max(1, value);
    row.inductive = row.startupCoef > 1;
  };
  const addRow = () => mutate((target) => target.appliances.push({
    id: `a-${Date.now()}`, name: t('loads2.nouvelAppareil'), qty: 1, unitPower: 100, yield: 0.9,
    operatingFractions: defaultOperatingFractions(4), opHours: 4, startupCoef: 1, inductive: false,
  }));

  const grid = useGridNav({
    rowCount: rows.length,
    colCount: COLS.length,
    addRow,
    getCell: (r, c) => String(rows[r]?.[COLS[c]] ?? ''),
    setCell: (r, c, raw) => setRow(r, (row) => {
      const key = COLS[c];
      if (key === 'name') { row.name = raw; return; }
      const value = Number.parseFloat(raw.replace(',', '.').replace(/\s/gu, ''));
      if (!Number.isFinite(value)) return;
      if (key === 'qty') row.qty = Math.max(1, Math.round(value));
      else if (key === 'unitPower') row.unitPower = Math.max(0, value);
      else if (key === 'yield') row.yield = value > 0 && value <= 1 ? value : row.yield;
      else if (key === 'opHours') setDuration(row, value);
      else setCoef(row, value);
    }),
  });

  const needle = filter.trim().toLowerCase();
  const visible = rows.map((row, index) => ({ row, index })).filter(({ row }) => !needle || row.name.toLowerCase().includes(needle));
  const lines = rows.map((row) => summarizeEquipmentRow(toScheduleRow(row)));
  const total = lines.some((line) => line === null) ? null : lines.reduce((sum, line) => ({
    installed: sum.installed + line!.installedUsefulPowerW, called: sum.called + line!.calledElectricalPowerW, energy: sum.energy + line!.dailyEnergyWh,
  }), { installed: 0, called: 0, energy: 0 });
  const startupPeak = equipmentStartupPeakW(rows.map(toScheduleRow));
  const inductiveCount = rows.filter((row) => row.inductive).length;

  const showHover = (id: string, element: HTMLElement) => {
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHover({ id, anchor: element.getBoundingClientRect() }), 250);
  };
  const hideHover = () => { window.clearTimeout(hoverTimer.current); setHover(null); };

  const exportRows = () => void saveFile({
    suggestedName: 'equipements.xlsx',
    data: new Blob([exportEquipmentWorkbook(rows.map((row) => ({ id: row.id, label: row.name, quantity: row.qty, usefulPowerW: row.unitPower, efficiencyRatio: row.yield ?? 1, startupPowerMultiplier: row.startupCoef > 1 ? row.startupCoef : null, durationHours: row.opHours, hourlyOperatingFractions: row.operatingFractions }))).slice().buffer as ArrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    filter: { name: 'Excel', extensions: ['xlsx'] },
  });
  const importRows = async (file: File) => {
    const result = inspectEquipmentWorkbook(await file.arrayBuffer());
    if (result.status === 'invalid') {
      notify({ kind: 'error', title: t('loads2.importRefuse'), detail: result.issues.slice(0, 3).map((issue) => `${issue.sheetName || t('loads.sheet')} ${issue.cellAddress || issue.columnName}: ${issue.message}`).join(' · ') });
      return;
    }
    mutate((target) => {
      target.appliances = result.candidate.map((row) => ({
        id: row.id, name: row.label, qty: row.quantity, unitPower: row.usefulPowerW, yield: row.efficiencyRatio,
        operatingFractions: row.hourlyOperatingFractions.map((value) => value ?? 0), opHours: row.durationHours,
        startupCoef: row.startupPowerMultiplier ?? 1, inductive: row.startupPowerMultiplier !== null,
      }));
    });
    notify({ kind: 'success', title: t('loads2.inventaireExcelImporte'), detail: `${fill(t('loads2.rowsValidated'), { count: result.candidate.length })}${result.warnings.length ? ` ${t('loads2.horairesParDefautAppliques')}` : ''}` });
  };

  const editingRow = editing === null ? null : rows.find((row) => row.id === editing.id) ?? null;
  const hoverRow = hover === null ? null : rows.find((row) => row.id === hover.id) ?? null;

  return (
    <section>
      {simultaneityNotice !== null && simultaneityNotice.length > 0 && (
        <div className="alert info" role="status">
          <div><b>{t('loads.simultaneityRemovedTitle')}</b> {fill(t('loads.simultaneityRemovedBody'), { rows: simultaneityNotice.join(', ') })}</div>
          <button type="button" className="btn btn-ghost" onClick={onDismissNotice}>{t('g.close')}</button>
        </div>
      )}
      <div className="tbl-title">
        <h2 className="h-sec">{t('loads.appliances')}</h2>
        <span className="label">
          {fill(t(rows.length === 1 ? 'loads.rowCountOne' : 'loads.rowCount'), { count: rows.length })}
          {inductiveCount > 0 && ` · ${fill(t('loads.inductiveCount'), { count: inductiveCount })}`}
          {filter && ` · ${fill(t('loads2.filtered'), { count: visible.length })}`}
        </span>
        <input className="hdr-search" style={{ width: 160 }} placeholder={t('loads2.filtrerParNom')} value={filter} onChange={(event) => setFilter(event.target.value)} />
        <span className="sep" />
        <button type="button" className="btn" disabled={rows.length === 0} onClick={() => setPlanner(true)}>{t('hours.plannerButton')}</button>
        <button type="button" className="btn" onClick={() => notify({ kind: 'info', title: t('loads2.collageDepuisExcel'), detail: t('loads2.pasteHelp') })}>{t('loads.pasteHelpButton')}</button>
        <input ref={importRef} type="file" accept=".xlsx,.xls" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void importRows(file); event.target.value = ''; }} />
        <button type="button" className="btn" onClick={() => importRef.current?.click()}>{t('loads.importExcel')}</button>
        <button type="button" className="btn" onClick={exportRows}>{t('loads.exportExcel')}</button>
      </div>
      <div className="tbl-wrap" ref={grid.ref} onKeyDown={grid.onKeyDown} onPaste={grid.onPaste}>
        <table className="tbl t-appliances">
          <thead>
            <tr>
              <th>{t('loads.name')}</th>
              <th>{t('loads.quantity')}</th>
              <th>{t('loads.unitPower')}<span className="unit">W</span></th>
              <th>{t('loads.efficiency')}</th>
              <th>{t('loads.hours')}<span className="unit">h/j</span></th>
              <th>{t('loads.startingCoefficient')}</th>
              <th>{t('loads.inductiveColumn')}</th>
              <th className="derived">{t('loads.totalPower')}<span className="unit">W</span></th>
              <th className="derived">{t('loads.realPower')}<span className="unit">W</span></th>
              <th className="derived">{t('loads.totalEnergy')}<span className="unit">Wh</span></th>
              <th aria-label={t('loads2.actions')} />
            </tr>
          </thead>
          <tbody>
            {visible.map(({ row, index }) => {
              const line = lines[index] ?? null;
              const toSpecify = row.inductive && row.startupCoef <= 1;
              return (
                <tr key={row.id}>
                  <td className="name">
                    <input className="cell-in" data-r={index} data-c={0} aria-label={t('loads2.nom')} value={row.name} onChange={(event) => setRow(index, (target) => { target.name = event.target.value; })} />
                  </td>
                  <td>
                    <DraftNumberInput className="cell-in" data-r={index} data-c={1} aria-label={t('loads2.quantite')} value={row.qty} inputMode="numeric"
                      onCommit={(value) => { if (value !== null && Number.isInteger(value) && value >= 1) setRow(index, (target) => { target.qty = value; }); }} />
                  </td>
                  <td>
                    <DraftNumberInput className="cell-in" data-r={index} data-c={2} aria-label={t('loads2.puissanceUnitaire')} value={row.unitPower}
                      onCommit={(value) => { if (value !== null) setRow(index, (target) => { target.unitPower = Math.max(0, value); }); }} />
                  </td>
                  <td>
                    <DraftNumberInput className="cell-in" data-r={index} data-c={3} aria-label={t('loads2.rendement')} nullable value={row.yield} format={(value) => fmt(value, 2)}
                      onCommit={(value) => { if (value === null || (value > 0 && value <= 1)) setRow(index, (target) => { target.yield = value; }); }} />
                  </td>
                  <td className="hours-cell" onMouseEnter={(event) => showHover(row.id, event.currentTarget)} onMouseLeave={hideHover}>
                    <DraftNumberInput className="cell-in" data-r={index} data-c={4} aria-label={t('loads2.heuresDUsage')} value={row.opHours} format={(value) => fmt(value, value % 1 ? 2 : 0)}
                      onCommit={(value) => { if (value !== null) setRow(index, (target) => setDuration(target, value)); }} />
                    <button type="button" className="hours-open" aria-label={fill(t('hours.openSchedule'), { name: row.name })}
                      onFocus={(event) => showHover(row.id, event.currentTarget.parentElement!)} onBlur={hideHover}
                      onClick={(event) => { hideHover(); setEditing({ id: row.id, anchor: event.currentTarget.parentElement!.getBoundingClientRect() }); }}>
                      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                    </button>
                  </td>
                  <td className={toSpecify ? 'to-specify' : undefined} title={toSpecify ? t('loads.coefToSpecify') : undefined}>
                    <DraftNumberInput className="cell-in" data-r={index} data-c={5} aria-label={t('loads2.coefficientDeDemarrage')} value={row.startupCoef} format={(value) => fmt(value, value % 1 ? 1 : 0)}
                      onCommit={(value) => { if (value !== null && value >= 1) setRow(index, (target) => setCoef(target, value)); }} />
                  </td>
                  <td className="check-cell">
                    <input type="checkbox" aria-label={fill(t('loads.inductiveFor'), { name: row.name })} checked={row.inductive}
                      onChange={(event) => setRow(index, (target) => { target.inductive = event.target.checked; if (!event.target.checked) target.startupCoef = 1; })} />
                  </td>
                  <td className="derived num">{line === null ? '—' : fmt(line.installedUsefulPowerW, 0)}</td>
                  <td className="derived num">{line === null ? '—' : fmt(line.calledElectricalPowerW, 0)}</td>
                  <td className="derived num">{line === null ? '—' : fmt(line.dailyEnergyWh, 0)}</td>
                  <td>
                    <button type="button" className="rowdel" title={t('loads2.supprimerLaLigne')} aria-label={t('loads2.supprimerLaLigne')} onClick={() => mutate((target) => { target.appliances.splice(index, 1); })}>✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7}>{t('loads.total')}</td>
              <td className="num">{total === null ? '—' : fmt(total.installed, 0)}</td>
              <td className="num">{total === null ? '—' : fmt(total.called, 0)}</td>
              <td className="num">{total === null ? '—' : fmt(total.energy, 0)}</td>
              <td />
            </tr>
            {inductiveCount > 0 && (
              <tr className="startup-peak">
                <td colSpan={7} title={t('loads.startupPeakHelp')}>{t('loads.startupPeak')}</td>
                <td />
                <td className="num">{startupPeak === null ? '—' : fmt(startupPeak, 0)}</td>
                <td colSpan={2} />
              </tr>
            )}
          </tfoot>
        </table>
        <div className="addrow">
          <button type="button" className="btn" onClick={addRow}>+ {t('loads.addRow')}</button>
          <span className="sep" />
          <span className="kbd">{t('loads2.entree')}</span> {t('loads.kbd.newRow')} ·{' '}
          <span className="kbd">Ctrl D</span> {t('loads.kbd.fillDown')} ·{' '}
          <span className="kbd">Ctrl V</span> {t('loads.kbd.pasteRange')}
        </div>
      </div>

      {hoverRow !== null && hover !== null && editing === null && createPortal(
        <div className="hover-card" role="tooltip" style={{ top: hover.anchor.bottom + 4, left: Math.min(hover.anchor.left, window.innerWidth - 320) }}>
          <b>{hoverRow.name} · {fmt(hoverRow.opHours, hoverRow.opHours % 1 ? 2 : 0)} h/j</b>
          <HoursScale />
          <HoursStrip fractions={hoverRow.operatingFractions} />
          <span className="label">{formatHourBlocks(selectedHours(hoverRow.operatingFractions)) || t('hours.none')} · {t('hours.clickToEdit')}</span>
        </div>,
        document.body,
      )}

      {editingRow !== null && editing !== null && (
        <HoursPopover
          anchor={editing.anchor}
          name={editingRow.name}
          durationHours={editingRow.opHours}
          fractions={editingRow.operatingFractions}
          onClose={() => setEditing(null)}
          onApply={(schedule) => {
            const index = rows.findIndex((row) => row.id === editingRow.id);
            setRow(index, (target) => { target.opHours = schedule.durationHours; target.operatingFractions = schedule.fractions; });
            setEditing(null);
          }}
        />
      )}

      {planner && (
        <HoursPlanner
          appliances={rows.map((row, index) => ({ id: row.id, name: row.name, durationHours: row.opHours, fractions: row.operatingFractions, runningPowerW: lines[index]?.calledElectricalPowerW ?? null }))}
          onClose={() => setPlanner(false)}
          onApply={(schedules) => {
            mutate((target) => target.appliances.forEach((row) => {
              const schedule = schedules.get(row.id);
              if (schedule) { row.opHours = schedule.durationHours; row.operatingFractions = schedule.fractions; }
            }));
            setPlanner(false);
          }}
        />
      )}
    </section>
  );
}
