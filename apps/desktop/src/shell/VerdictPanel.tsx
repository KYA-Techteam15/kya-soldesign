import { useLocation } from 'react-router-dom';
import type { PresizingOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../app/models/projectView';
import { useT } from '../i18n';
import { useUi } from '../store/ui';
import { useCalculationState } from '../app/CalculationProvider';
import { CapabilityNotice } from '../ui/CapabilityNotice';
import { DayBalance } from './DayBalance';
import { currencyLabel, fmt } from '../domain/format';

export function VerdictPanel({ project }: { readonly project: ProjectViewModel }) {
  const t = useT();
  const toggleVerdict = useUi((state) => state.toggleVerdict);
  const lang = useUi((state) => state.lang);
  const money = currencyLabel(project.currency, lang);
  const onLoads = useLocation().pathname.endsWith('/besoins');
  const state = useCalculationState<PresizingOutputV1>(project.id, 'presizing', project.updatedAt);
  const output = state.status === 'ready' ? state.envelope.output : null;
  const candidate = output?.selected ?? null;
  const viable = output?.viable ?? false;

  return (
    <aside className="pane pane-right">
      <div className={'verdict ' + (output === null ? 'is-wait' : viable ? 'is-ok' : 'is-bad')}>
        <div className="verdict-head">
          <h2 className="h-sec" title={t('v.presizedHelp')}>{t('v.viabilityPresized')}</h2>
          <span className="sep" style={{ flex: 1 }} />
          {!onLoads && <button className="toggle" onClick={toggleVerdict} title={t('v.collapse')} aria-label={t('v.collapse')}>›</button>}
        </div>
        {output === null ? <CapabilityNotice capability="presizing" state={state} compact /> : <>
          <div className="verdict-val">{fmt(candidate?.svi ?? 0, 2)}</div>
          <p className="verdict-say"><b>{viable ? t('v.viable') : t('v.notViable')}</b> · {t('v.threshold')} &lt; 1</p>
        </>}
      </div>

      <DayBalance project={project} defaultOpen={onLoads} pinned={onLoads} />

      <div className="kpis kpis-all">
        <div className="kpi kpi-head"><span className="h-sec">{t('v.reliability')}</span></div>
        <Metric label="SRI" value={candidate === null ? null : fmt(candidate.sri, 3)} />
        <Metric label="LPSP · LOLP" value={candidate === null ? null : fmt(candidate.lpsp * 100, 1) + ' · ' + fmt(candidate.lolp * 100, 1) + ' %'} />
        <div className="kpi kpi-head"><span className="h-sec">{t('v.systemMinimum')}</span></div>
        <Metric label={t('v.peakPower')} value={candidate === null ? null : fmt(candidate.pvPeakKw, 2) + ' kWc'} />
        <Metric label={t('v.storage')} value={candidate === null ? null : fmt(candidate.storageKwh, 2) + ' kWh'} />
        <Metric label={t('v.inverter')} value={candidate === null ? null : fmt(candidate.inverterKw, 2) + ' kW'} />
        <Metric label={t('v.production')} value={candidate === null ? null : fmt(candidate.annualProductionKwh, 0) + ` kWh/${t('unit.year')}`} />
        <div className="kpi kpi-head"><span className="h-sec">{t('v.economy')}</span></div>
        <Metric label={t('v.lcoe')} value={candidate === null ? null : fmt(candidate.lcoe, 0) + ` ${money}/kWh`} />
        <Metric label="SVI" value={candidate === null ? null : fmt(candidate.svi, 2)} />
      </div>
    </aside>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string | null }) {
  return <div className="kpi"><span>{label}</span><span><b>{value ?? '—'}</b></span></div>;
}
