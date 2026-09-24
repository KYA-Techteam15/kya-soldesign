import { useSearchParams } from 'react-router-dom';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { StepHead } from '../../ui/Flow';
import { useCalculationState } from '../../app/CalculationProvider';
import { useCalculationFacts } from '../../app/calculation/useCalculationFacts';
import { sectionStates, type Level } from '../../domain/completion';
import { currencyLabel, fmt } from '../../domain/format';
import { useCatalog } from '../../app/CatalogProvider';
import { DossierDocuments } from '../dossier/DossierDocuments';
import { SynopticView } from '../dossier/SynopticView';
import { useT } from '../../i18n';
import { useUi } from '../../store/ui';

type Tab = 'synthese' | 'synoptique' | 'documents';
const TABS: readonly { readonly key: Tab; readonly label: string }[] = [
  { key: 'synthese', label: 'dossier.tab.review' },
  { key: 'synoptique', label: 'dossier.tab.diagram' },
  { key: 'documents', label: 'dossier.tab.documents' },
];

const STEPS = [
  ['dossier.step.project', 'projet'], ['dossier.step.site', 'site'], ['dossier.step.loads', 'besoins'],
  ['dossier.step.presizing', 'hypotheses'], ['dossier.step.sizing', 'materiel'], ['dossier.step.protections', 'protections'],
  ['dossier.step.costing', 'chiffrage'],
] as const;

const LEVEL: Record<Level, { readonly tone: string; readonly key: string }> = {
  done: { tone: 'ok', key: 'dossier.level.done' },
  partial: { tone: 'warn', key: 'dossier.level.partial' },
  empty: { tone: 'bad', key: 'dossier.level.empty' },
};

export function SectionDossier() {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const project = useProject();
  const { equipment } = useCatalog();
  const [params, setParams] = useSearchParams();
  const asked = params.get('vue');
  const tab: Tab = TABS.some((item) => item.key === asked) ? asked as Tab : 'synthese';
  const { facts, sizing, finance, presizing } = useCalculationFacts(project);
  const solarState = useCalculationState<SolarResourceAnalysisOutputV1>(project.id, 'solar-resource', project.updatedAt);
  const solar = solarState.status === 'ready' ? solarState.envelope.output : null;
  const states = sectionStates(project, lang, facts);
  const money = currencyLabel(project.currency, lang);
  const done = STEPS.filter(([, key]) => states[key]?.level === 'done').length;

  return (
    <div className={`sheet ${tab === 'documents' ? 'prints-paper' : ''}`}>
      <StepHead slug="dossier" aside={
        <div className="seg" role="tablist" aria-label={t('dossier.tabs')}>
          {TABS.map((item) => (
            <button key={item.key} role="tab" aria-selected={tab === item.key} onClick={() => setParams(item.key === 'synthese' ? {} : { vue: item.key }, { replace: true })}>{t(item.label)}</button>
          ))}
        </div>
      } />
      {tab === 'synoptique' ? <SynopticView project={project} sizing={sizing} pending={false} catalog={equipment} />
        : tab === 'documents' ? <DossierDocuments project={project} sizing={sizing} finance={finance} solar={solar} presizing={presizing} catalog={equipment} facts={facts} />
          : (
            <>
              <section className="out">
                <div className="out-head">
                  <span className="out-tag">{t('dossier.summaryTag')}</span>
                  <h2 className="h-sec">{t('dossier.summary')}</h2>
                  <span className="sep" />
                  <span className="label">{project.details.projectNumber || t('dossier.noReference')}</span>
                </div>
                <div className="out-grid">
                  <Cell label={t('dossier.project')} value={project.name} text />
                  <Cell label={t('dossier.client')} value={project.details.clientName || '—'} text />
                  <Cell label={t('dossier.location')} value={project.details.projectLocation || project.site.region || '—'} text />
                </div>
              </section>

              <section>
                <div className="tbl-title">
                  <h2 className="h-sec">{t('dossier.status')}</h2>
                  <span className="sep" />
                  <span className="label">{done}/{STEPS.length} {t('dossier.stepsValidated')}</span>
                </div>
                <div className="kpis">
                  {STEPS.map(([label, key]) => {
                    const state = states[key]!;
                    const level = LEVEL[state.level];
                    return (
                      <div className="kpi" key={key}>
                        <span>{t(label)}{state.missing.length > 0 && <small className="label dossier-missing">{state.missing.join(' · ')}</small>}</span>
                        <span className={`badge ${level.tone}`}>{t(level.key)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <div className="tbl-title">
                  <h2 className="h-sec">{t('dossier.retained')}</h2>
                  <span className="sep" />
                  <span className="label">{facts.sizing === 'stale' ? t('completion.stale') : t('dossier.retainedLead')}</span>
                </div>
                <div className="out-grid">
                  <Cell label={t('dossier.pvField')} value={sizing ? `${fmt(sizing.pv.obtainedPowerKwc, 2)} kWc` : '—'} note={sizing ? `${sizing.pv.totalModules} ${t('dossier.modules')} · ${sizing.pv.modulesInSeries}S × ${sizing.pv.stringsInParallel}P` : t('dossier.sizingRequired')} />
                  <Cell label={t('dossier.batteryBank')} value={sizing ? `${fmt(sizing.battery.usefulEnergyKwh, 1)} kWh` : '—'} note={sizing ? `${sizing.battery.totalUnits} ${t('dossier.units')} · ${sizing.battery.unitsInSeries}S × ${sizing.battery.stringsInParallel}P` : t('dossier.sizingRequired')} />
                  <Cell label={t('dossier.inverters')} value={sizing ? `${fmt(sizing.inverter.obtainedPowerKw, 1)} kW` : '—'} note={sizing ? `${sizing.inverter.count} ${t('dossier.units')}` : t('dossier.sizingRequired')} />
                </div>
              </section>

              <section>
                <div className="tbl-title">
                  <h2 className="h-sec">{t('dossier.indicators')}</h2>
                  <span className="sep" />
                  <span className="label">{facts.finance === 'stale' ? t('completion.stale') : t('dossier.retainedSystem')}</span>
                </div>
                <div className="out-grid finance-summary">
                  <Cell label={t('dossier.annualProduction')} value={finance ? `${fmt(finance.simulation.annualProductionKwh, 0)} kWh/${t('unit.year')}` : '—'} />
                  <Cell label="LPSP" value={finance ? `${fmt(finance.simulation.lpsp * 100, 1)} %` : '—'} />
                  <Cell label="LOLP" value={finance ? `${fmt(finance.simulation.lolp * 100, 1)} %` : '—'} />
                  <Cell label="SRI" value={finance ? fmt(finance.simulation.sri, 3) : '—'} />
                  <Cell label="SVI" value={finance ? fmt(finance.lifecycle.svi, 2) : '—'} />
                  <Cell label={t('dossier.lcoe')} value={finance ? `${fmt(finance.lifecycle.lcoeActualized, 1)} ${money}/kWh` : '—'} />
                  <Cell label={t('dossier.saleHt')} value={finance ? `${fmt(finance.totalSaleHt, 0)} ${money}` : '—'} />
                  <Cell label={t('dossier.margin')} value={finance ? `${fmt(finance.averageMarginRatio * 100, 1)} %` : '—'} />
                </div>
              </section>
            </>
          )}
    </div>
  );
}

function Cell({ label, value, note, text = false }: { readonly label: string; readonly value: string; readonly note?: string; readonly text?: boolean }) {
  return (
    <div className={`out-cell ${value === '—' ? 'is-pending' : ''}`}>
      <span className="out-lbl">{label}</span>
      <span className={`out-val ${text ? 'out-val-text' : ''}`}><b>{value}</b></span>
      {note && <span className="out-note">{note}</span>}
    </div>
  );
}
