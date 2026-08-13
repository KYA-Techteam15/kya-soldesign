import { useOutletContext } from 'react-router-dom';
import type { ProjectViewModel } from '../../app/models/projectView';

/**
 * Ébauche honnête d'une section (phase 2). Elle dit ce qu'elle contiendra et
 * d'où ça vient dans l'app actuelle — jamais un écran vide, jamais une impasse.
 */
export function Stub({
  title,
  lead,
  items,
  source,
}: {
  title: string;
  lead: string;
  items: string[];
  source: string;
}) {
  return (
    <div className="sheet">
      <div className="sheet-head">
        <h1 className="h-page">{title}</h1>
        <span className="sep" />
        <span className="badge">Ébauche — phase 2</span>
      </div>
      <div className="stub">
        <b>{lead}</b>
        <ul>
          {items.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <span className="tag">{source}</span>
      </div>
    </div>
  );
}

export const useProject = (): ProjectViewModel => useOutletContext<ProjectViewModel>();
