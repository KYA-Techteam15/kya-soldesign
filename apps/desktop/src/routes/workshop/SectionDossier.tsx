import { useSearchParams } from 'react-router-dom';
import { useProject } from './Stub';
import { StepHead } from '../../ui/Flow';
import { useCalculationState } from '../../app/CalculationProvider';
import type { FinanceOutputV1, SizingOutputV1 } from '@ksd/engine';
import { sectionStates } from '../../domain/completion';
import { fmt } from '../../domain/format';
import { useCatalog } from '../../app/CatalogProvider';
import { DossierDocuments } from '../dossier/DossierDocuments';
import { SynopticView } from '../dossier/SynopticView';

type Tab = 'synthese' | 'synoptique' | 'documents';
const TABS: readonly { readonly key: Tab; readonly label: string }[] = [
  { key: 'synthese', label: 'Vérifier le dossier' },
  { key: 'synoptique', label: 'Schéma de l’installation' },
  { key: 'documents', label: 'Imprimer les documents' },
];

export function SectionDossier() {
  const project = useProject();
  const { equipment } = useCatalog();
  const [params, setParams] = useSearchParams();
  const asked = params.get('vue');
  const tab: Tab = TABS.some((item) => item.key === asked) ? asked as Tab : 'synthese';
  const sizing = useCalculationState<SizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const finance = useCalculationState<FinanceOutputV1>(project.id, 'finance', project.updatedAt);
  const sizingOutput = sizing.status === 'ready' ? sizing.envelope.output : null;
  const financeOutput = finance.status === 'ready' ? finance.envelope.output : null;
  const states = sectionStates(project);
  const sections = [['Projet', 'projet'], ['Site et météo', 'site'], ['Besoins', 'besoins'], ['Prédimensionnement', 'hypotheses'], ['Dimensionnement', 'materiel'], ['Protections et câbles', 'protections'], ['Évaluation financière', 'chiffrage']] as const;
  const shown = (n: number | undefined, unit = '') => n === undefined ? '—' : fmt(n, unit === '%' ? 1 : 2) + (unit ? ' ' + unit : '');
  const stateClass = (key: string) => states[key]?.level === 'done' ? 'ok' : states[key]?.level === 'partial' ? 'warn' : 'bad';
  const stateLabel = (key: string) => states[key]?.level === 'done' ? 'VALIDÉ' : states[key]?.level === 'partial' ? 'À COMPLÉTER' : 'NON CONFIGURÉ';
  return <div className={'sheet ' + (tab === 'documents' ? 'prints-paper' : '')}><StepHead slug="dossier" aside={<div className="seg">{TABS.map((item) => <button key={item.key} aria-selected={tab === item.key} onClick={() => setParams(item.key === 'synthese' ? {} : { vue: item.key }, { replace: true })}>{item.label}</button>)}</div>} />
    {tab === 'synthese' ? <><section className="out"><div className="out-head"><span className="out-tag">RÉSUMÉ</span><h2 className="h-sec">Dossier projet</h2><span className="sep" /><span className="label">{project.details.projectNumber || 'Référence non définie'}</span></div><div className="out-grid"><div className="out-cell"><span className="out-lbl">Projet</span><span className="out-val"><b>{project.name}</b></span></div><div className="out-cell"><span className="out-lbl">Client</span><span className="out-val"><b>{project.details.clientName || '—'}</b></span></div><div className="out-cell"><span className="out-lbl">Localisation</span><span className="out-val"><b>{project.details.projectLocation || project.site.region || '—'}</b></span></div></div></section><section><div className="tbl-title"><h2 className="h-sec">État du dossier</h2><span className="sep" /><span className="label">{sections.filter(([, key]) => states[key]?.level === 'done').length}/{sections.length} étapes validées</span></div><div className="kpis">{sections.map(([label, key]) => <div className="kpi" key={key}><span>{label}</span><span className={'badge ' + stateClass(key)}>{stateLabel(key)}</span></div>)}</div></section><section><div className="tbl-title"><h2 className="h-sec">Système retenu</h2><span className="sep" /><span className="label">résultats du dimensionnement</span></div><div className="out-grid">{[['Champ PV', sizingOutput ? shown(sizingOutput.pv.obtainedPowerKwc, 'kWc') : '—', sizingOutput ? sizingOutput.pv.totalModules + ' modules · ' + sizingOutput.pv.modulesInSeries + 'S × ' + sizingOutput.pv.stringsInParallel + 'P' : 'Dimensionnement requis'], ['Parc batteries', sizingOutput ? shown(sizingOutput.battery.usefulEnergyKwh, 'kWh') : '—', sizingOutput ? sizingOutput.battery.totalUnits + ' unités · ' + sizingOutput.battery.unitsInSeries + 'S × ' + sizingOutput.battery.stringsInParallel + 'P' : 'Dimensionnement requis'], ['Onduleurs', sizingOutput ? shown(sizingOutput.inverter.obtainedPowerKw, 'kW') : '—', sizingOutput ? sizingOutput.inverter.count + ' unité(s)' : 'Dimensionnement requis']].map(([label, value, note]) => <div className={'out-cell ' + (sizingOutput ? '' : 'is-pending')} key={label}><span className="out-lbl">{label}</span><span className="out-val"><b>{value}</b></span><span className="out-note">{note}</span></div>)}</div></section><section><div className="tbl-title"><h2 className="h-sec">Indicateurs clés</h2><span className="sep" /><span className="label">système retenu</span></div><div className="out-grid finance-summary">{[['Production annuelle', financeOutput?.simulation.annualProductionKwh, 'kWh/an'], ['LPSP', financeOutput ? financeOutput.simulation.lpsp * 100 : undefined, '%'], ['LOLP', financeOutput ? financeOutput.simulation.lolp * 100 : undefined, '%'], ['SRI', financeOutput?.simulation.sri, ''], ['SVI', financeOutput?.lifecycle.svi, ''], ['LCOE actualisé', financeOutput?.lifecycle.lcoeActualized, 'FCFA/kWh'], ['Vente HT', financeOutput?.totalSaleHt, 'FCFA'], ['Marge bénéficiaire', financeOutput ? financeOutput.averageMarginRatio * 100 : undefined, '%']].map(([label, n, unit]) => <div className={'out-cell ' + (n === undefined ? 'is-pending' : '')} key={label as string}><span className="out-lbl">{label as string}</span><span className="out-val"><b>{shown(n as number | undefined, unit as string)}</b></span></div>)}</div></section></> : tab === 'synoptique' ? <SynopticView project={project} sizing={sizingOutput} catalog={equipment} /> : <DossierDocuments project={project} sizing={sizingOutput} finance={financeOutput} catalog={equipment} />}
  </div>;
}
