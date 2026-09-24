import { useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { OptimizationCandidate, OptimizationRequest, OptimizationResult } from '@ksd/engine';
import { Dialog } from '../../ui/Dialog';
import { fmt, signed } from '../../domain/format';
import { useT } from '../../i18n';

export function OptimizationResults({ result, request, equipment, onApply, onClose }: {
  readonly result: OptimizationResult;
  readonly request: OptimizationRequest;
  readonly equipment: readonly Equipment[];
  readonly onApply: (candidate: OptimizationCandidate) => void;
  readonly onClose: () => void;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState<OptimizationCandidate | null>(null);
  const label = (id: string) => {
    const found = equipment.find((item) => item.id === id);
    return found ? `${found.model} · ${found.manufacturer}` : id;
  };
  const objectiveJustification = request.objective === 'closest' ? t('optimization.justificationObjectiveClosest') : request.objective === 'lowest-main-equipment-cost' ? t('optimization.justificationObjectiveCost') : t('optimization.justificationObjectiveFewest');

  return (
    <Dialog
      title={t('optimization.resultsTitle')}
      lead={t('optimization.resultsLead')}
      wide
      onClose={onClose}
      footer={<button className="btn" onClick={onClose}>{t('g.cancel')}</button>}
    >
      <div className="opt-results">
        {result.status === 'blocked' && (
          <div className="alert warn">
            <div>
              <b>{result.code === 'OPTIMIZATION_DISABLED' ? t('optimization.blockedDisabled') : result.code === 'OPTIMIZATION_SCOPE_EMPTY' ? t('optimization.blockedScopeEmpty') : t('optimization.blockedCostUnavailable')} — </b>
              {result.message}
            </div>
          </div>
        )}
        {result.status === 'complete' && (
          <>
            <p className="opt-results-summary">{t('optimization.candidatesFound').replace('{n}', String(result.candidates.length)).replace('{examined}', String(result.examined))}</p>
            {result.candidates.length === 0 && <div className="alert warn"><div>{t('optimization.noCandidate')}</div></div>}
            <div className="opt-candidates">
              {result.candidates.map((candidate) => (
                <article key={candidate.stableKey} className={`opt-candidate ${candidate.rank === 1 ? 'is-best' : ''}`}>
                  <div className="opt-candidate-head">
                    <span className="label">{t('optimization.rank')} #{candidate.rank}</span>
                    <button className="btn btn-ok" onClick={() => setConfirming(candidate)}>{t('optimization.apply')}</button>
                  </div>
                  <div className="opt-candidate-refs">
                    <span><b>{t('optimization.module')}</b> · {label(candidate.input.module.id)}</span>
                    <span><b>{t('optimization.battery')}</b> · {label(candidate.input.battery.id)}</span>
                    <span><b>{t('optimization.inverter')}</b> · {label(candidate.input.inverter.id)}</span>
                  </div>
                  <div className="opt-candidate-metrics">
                    <span>{t('optimization.deltaPv')} <b>{signed(candidate.relativeOversize.pv * 100, 1)}<span className="unit">%</span></b></span>
                    <span>{t('optimization.deltaStorage')} <b>{signed(candidate.relativeOversize.storage * 100, 1)}<span className="unit">%</span></b></span>
                    <span>{t('optimization.deltaInverter')} <b>{signed(candidate.relativeOversize.inverter * 100, 1)}<span className="unit">%</span></b></span>
                    <span>{t('optimization.componentCount')} <b>{candidate.componentCount}</b></span>
                    <span>{t('optimization.indicativeCost')} <b>{candidate.completeCostMinor === null ? t('optimization.costUnavailable') : `${fmt(candidate.completeCostMinor)} FCFA`}</b></span>
                  </div>
                  <p className="opt-candidate-justification">{objectiveJustification}</p>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      {confirming && (
        <Dialog title={t('optimization.applyConfirmTitle')} onClose={() => setConfirming(null)} footer={<>
          <button className="btn" onClick={() => setConfirming(null)} data-autofocus>{t('g.cancel')}</button>
          <button className="btn btn-ok" onClick={() => { onApply(confirming); setConfirming(null); }}>{t('optimization.apply')}</button>
        </>}>
          <p>{t('optimization.applyConfirmBody')}</p>
        </Dialog>
      )}
    </Dialog>
  );
}