import { useSearchParams } from 'react-router-dom';
import { useProject } from './Stub';
import { StepHead } from '../../ui/Flow';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';

type Tab = 'synthese' | 'synoptique' | 'documents';
const TABS: readonly { readonly key: Tab; readonly label: string }[] = [
  { key: 'synthese', label: 'Vérifier le dossier' },
  { key: 'synoptique', label: 'Schéma de l’installation' },
  { key: 'documents', label: 'Imprimer les documents' },
];

export function SectionDossier() {
  const project = useProject();
  const [params, setParams] = useSearchParams();
  const asked = params.get('vue');
  const tab: Tab = TABS.some((item) => item.key === asked) ? asked as Tab : 'synthese';
  const state = useCalculationState(project.id, 'dossier', project.updatedAt);
  return <div className="sheet"><StepHead slug="dossier" aside={<div className="seg">{TABS.map((item) => <button key={item.key} aria-selected={tab === item.key} onClick={() => setParams(item.key === 'synthese' ? {} : { vue: item.key }, { replace: true })}>{item.label}</button>)}</div>} />
    <CapabilityNotice capability="dossier" state={state} />
    <section className="out is-stale"><div className="out-head"><span className="out-tag">indisponible</span><h2 className="h-sec">{tab === 'synthese' ? 'Synthèse du dossier' : tab === 'synoptique' ? 'Synoptique de l’installation' : 'Documents client'}</h2></div><div className="out-grid">{['Projet et client', 'Site et climat', 'Besoins', 'Système retenu', 'Fiabilité', 'Chiffrage'].map((label) => <div className="out-cell is-pending" key={label}><span className="out-lbl">{label}</span><span className="out-val"><b>—</b></span></div>)}</div></section>
  </div>;
}
