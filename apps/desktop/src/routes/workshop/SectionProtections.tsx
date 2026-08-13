import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { StepHead } from '../../ui/Flow';
import type { CableSegment } from '../../app/models/projectView';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { useT } from '../../i18n';

const LABEL: Readonly<Record<CableSegment, string>> = {
  pv_inverter: 'PV → Onduleur',
  inverter_battery: 'Onduleur → Batterie',
  inverter_load: 'Onduleur → Charges',
};

export function SectionProtections() {
  const t = useT();
  const project = useProject();
  const update = useProjects((state) => state.update);
  const state = useCalculationState(project.id, 'protections', project.updatedAt);
  const num = (value: string) => {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return <div className="sheet">
    <StepHead slug="protections" aside={<span className="label">Les choix saisis sont conservés ; aucun calibre n’est conseillé sans calcul.</span>} />
    <CapabilityNotice capability="protections" state={state} compact />
    <section><div className="tbl-title"><h2 className="h-sec">{t('protections.title')}</h2><span className="label">calibre saisi, sans recommandation automatique</span></div><div className="tbl-wrap"><table className="tbl t-prot"><thead><tr><th>{t('protections.segment')}</th><th>{t('catalog.type')}</th><th className="derived">{t('protections.requiredCurrent')}<span className="unit">A</span></th><th className="pick">{t('protections.selectedRating')}<span className="unit">A</span></th><th className="derived">{t('protections.voltage')}<span className="unit">V</span></th><th>{t('protections.state')}</th></tr></thead><tbody>
      {project.protections.map((choice, index) => <tr key={choice.segment}><td>{LABEL[choice.segment]}</td><td>{t('protections.toDetermine')}</td><td className="derived num">—</td><td className="pick"><input className="cell-in" aria-label={`Calibre ${LABEL[choice.segment]}`} value={choice.caliberA ?? ''} placeholder="—" onChange={(event) => update((draft) => { draft.protections[index].caliberA = event.target.value ? num(event.target.value) : null; })} /></td><td className="derived num">—</td><td><span className="badge">{t('protections.unverified')}</span></td></tr>)}
    </tbody></table></div></section>
    <section><div className="tbl-title"><h2 className="h-sec">{t('cables.title')}</h2><span className="label">longueur, matériau et pose saisis · résultats indisponibles</span></div><div className="tbl-wrap"><table className="tbl t-cables"><thead><tr><th>{t('protections.segment')}</th><th>{t('cables.length')}<span className="unit">m</span></th><th>{t('cables.material')}</th><th>{t('cables.installation')}</th><th className="derived">{t('cables.current')}<span className="unit">A</span></th><th className="derived">{t('cables.drop')}<span className="unit">%</span></th><th className="derived">{t('cables.minSection')}<span className="unit">mm²</span></th><th className="derived">{t('cables.standardSection')}<span className="unit">mm²</span></th></tr></thead><tbody>
      {project.cables.map((cable, index) => <tr key={cable.segment}><td>{LABEL[cable.segment]}</td><td><input className="cell-in" aria-label={`Longueur ${LABEL[cable.segment]}`} value={cable.length} onChange={(event) => update((draft) => { draft.cables[index].length = num(event.target.value); })} /></td><td><select className="cell-in" aria-label={`Matériau ${LABEL[cable.segment]}`} value={cable.material} onChange={(event) => update((draft) => { draft.cables[index].material = event.target.value as 'copper' | 'aluminium'; })}><option value="copper">{t('cables.copper')}</option><option value="aluminium">{t('cables.aluminium')}</option></select></td><td><select className="cell-in" aria-label={`Pose ${LABEL[cable.segment]}`} value={cable.installation} onChange={(event) => update((draft) => { draft.cables[index].installation = event.target.value as 'buried' | 'not_buried'; })}><option value="not_buried">{t('cables.aerial')}</option><option value="buried">{t('cables.buried')}</option></select></td><td className="derived num">—</td><td className="derived num">—</td><td className="derived num">—</td><td className="derived num">—</td></tr>)}
    </tbody></table></div></section>
  </div>;
}
