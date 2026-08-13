import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function ProtectionStep({ project }: WorkshopStepProps) {
  const v = useValidatedCopy();
  const segments = [v('pvToInverter'), v('inverterToBattery'), v('inverterToLoads')];
  return <UnavailableCapability projectId={project.id} capability="protections" titleKey="workshop.protections"><div className="form-stack">
    <section>
      <div className="tbl-title"><h2 className="h-sec">{v('protections')}</h2><span className="label">{v('advisedRating')}</span></div>
      <div className="tbl-wrap"><table className="tbl t-prot"><thead><tr><th>{v('segment')}</th><th>{v('type')}</th><th className="derived">{v('requiredCurrent')}</th><th>{v('selectedRating')}</th><th className="derived">{v('voltage')}</th><th className="derived">{v('quantityShort')}</th><th>{v('state')}</th></tr></thead><tbody>{segments.map((segment) => <tr key={segment}><td>{segment}</td><td>—</td><td className="derived num">—</td><td className="num">—</td><td className="derived num">—</td><td className="derived num">—</td><td><span className="badge warn">{v('waiting')}</span></td></tr>)}</tbody></table></div>
    </section>
    <section>
      <div className="tbl-title"><h2 className="h-sec">{v('cables')}</h2><span className="label">{v('cableHelp')}</span></div>
      <div className="tbl-wrap"><table className="tbl t-cables"><thead><tr><th>{v('segment')}</th><th>{v('length')}</th><th>{v('material')}</th><th>{v('installation')}</th><th className="derived">{v('current')}</th><th className="derived">{v('drop')}</th><th className="derived">{v('minSection')}</th><th className="derived">{v('standardized')}</th></tr></thead><tbody>{segments.map((segment) => <tr key={segment}><td>{segment}</td><td><input className="cell-in" aria-label={`${v('length')} ${segment}`} /></td><td><select className="cell-in" aria-label={`${v('material')} ${segment}`}><option>{v('copper')}</option><option>{v('aluminium')}</option></select></td><td><select className="cell-in" aria-label={`${v('installation')} ${segment}`}><option>{v('aerial')}</option><option>{v('buried')}</option></select></td><td className="derived num">—</td><td className="derived num">—</td><td className="derived num">—</td><td className="derived num">—</td></tr>)}</tbody></table></div>
    </section>
  </div></UnavailableCapability>;
}
