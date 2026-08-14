import { useEffect, useState } from 'react';
import type { ProjectViewModel } from '../app/models/projectView';
import { useCalculationState } from '../app/CalculationProvider';
import { CapabilityNotice } from '../ui/CapabilityNotice';
import type { AioOutputValue, AioSizingOutputV1 } from '@ksd/engine';

export function DayBalance({
  project,
  defaultOpen = false,
  pinned = false,
}: {
  readonly project: ProjectViewModel;
  readonly defaultOpen?: boolean;
  readonly pinned?: boolean;
}) {
  const state = useCalculationState<AioSizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const [collapsed, setCollapsed] = useState(!defaultOpen);
  useEffect(() => setCollapsed(!defaultOpen), [defaultOpen]);
  const open = pinned || !collapsed;

  return (
    <div className={`dayb ${open ? '' : 'is-shut'}`}>
      <div className="dayb-head">
        <span className="h-sec">Charge &amp; irradiance</span>
        <span className="sep" />
        {!pinned && (
          <button
            className="toggle"
            onClick={() => setCollapsed((value) => !value)}
            aria-expanded={open}
            title={open ? 'Replier le graphe' : 'Afficher le graphe'}
          >
            {open ? '▾' : '▸'}
          </button>
        )}
      </div>
      {open && <CapabilityNotice capability="sizing" state={state} compact />}
      <div className="dayb-stats" aria-label="Bilan énergétique de la Page 1">
        <BalanceValue value={state.status === 'ready' ? state.envelope.output.dailyAcEnergyWh : null} unit="Wh/j" />
        <BalanceValue value={state.status === 'ready' ? state.envelope.output.peakCoincidentAcPowerW : null} unit="W moyen max" />
        <BalanceValue value={state.status === 'ready' ? state.envelope.output.minimumInverterSurgeAcPowerW : null} unit="W démarrage" />
        <span><b>—</b><i>γ · SIM-001</i></span>
      </div>
    </div>
  );
}

function BalanceValue({ value, unit }: { readonly value: AioOutputValue | null; readonly unit: string }) {
  return <span><b>{value?.status === 'available' ? value.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) : '—'}</b><i>{unit}</i></span>;
}
