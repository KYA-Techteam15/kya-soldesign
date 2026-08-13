import { useEffect, useState } from 'react';
import type { ProjectViewModel } from '../app/models/projectView';
import { useCalculationState } from '../app/CalculationProvider';
import { CapabilityNotice } from '../ui/CapabilityNotice';

export function DayBalance({
  project,
  defaultOpen = false,
  pinned = false,
}: {
  readonly project: ProjectViewModel;
  readonly defaultOpen?: boolean;
  readonly pinned?: boolean;
}) {
  const state = useCalculationState(project.id, 'reliability', project.updatedAt);
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
      {open && <CapabilityNotice capability="reliability" state={state} compact />}
      <div className="dayb-stats" aria-label="Indicateurs en attente de calcul">
        {['kWh/j', 'kW total', 'kW pointe', 'γ'].map((unit) => (
          <span key={unit}><b>—</b><i>{unit}</i></span>
        ))}
      </div>
    </div>
  );
}
