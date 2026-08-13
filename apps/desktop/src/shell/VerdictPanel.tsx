import { useLocation } from 'react-router-dom';
import type { ProjectViewModel } from '../app/models/projectView';
import { useT } from '../i18n';
import { useUi } from '../store/ui';
import { useCalculationState } from '../app/CalculationProvider';
import { CapabilityNotice } from '../ui/CapabilityNotice';
import { DayBalance } from './DayBalance';

export function VerdictPanel({ project }: { readonly project: ProjectViewModel }) {
  const t = useT();
  const toggleVerdict = useUi((state) => state.toggleVerdict);
  const onLoads = useLocation().pathname.endsWith('/besoins');
  const state = useCalculationState(project.id, 'reliability', project.updatedAt);

  return (
    <aside className="pane pane-right">
      <div className="verdict is-wait">
        <div className="verdict-head">
          <h2 className="h-sec">{t('v.viability')}</h2>
          <span className="sep" style={{ flex: 1 }} />
          {!onLoads && <button className="toggle" onClick={toggleVerdict} title="Replier le panneau">›</button>}
        </div>
        <CapabilityNotice capability="reliability" state={state} compact />
      </div>

      <DayBalance project={project} defaultOpen={onLoads} pinned={onLoads} />

      <div className="kpis kpis-all">
        <div className="kpi kpi-head"><span className="h-sec">{t('v.reliability')}</span></div>
        {['SRI', 'LPSP · LOLP'].map((label) => <div className="kpi" key={label}><span>{label}</span><span><b>—</b></span></div>)}
        <div className="kpi kpi-head"><span className="h-sec">{t('v.systemMinimum')}</span></div>
        {[t('v.peakPower'), t('v.storage'), t('v.inverter'), t('v.production')].map((label) => <div className="kpi" key={label}><span>{label}</span><span><b>—</b></span></div>)}
        <div className="kpi kpi-head"><span className="h-sec">{t('v.economy')}</span></div>
        {[t('v.lcoe'), t('v.totalTtc')].map((label) => <div className="kpi" key={label}><span>{label}</span><span><b>—</b></span></div>)}
      </div>
    </aside>
  );
}
