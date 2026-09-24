import { useEffect, useRef, useState } from 'react';
import { useCalculationService } from '../CalculationProvider.js';
import type { ProjectViewModel } from '../models/projectView.js';

/** Calcul à relancer : le prédimensionnement (entrées modifiées) ou le dimensionnement seul. */
export type Staleness = 'presizing' | 'sizing';

/**
 * Projets « périmés » de l'accueil : un calcul enregistré ne correspond plus aux entrées. Lu aux
 * mêmes sources que l'atelier, projet après projet, sans bloquer l'affichage. Un dossier émis
 * n'est jamais périmé : il est figé tel qu'il a été remis.
 */
export function useStaleProjects(projects: readonly ProjectViewModel[]): ReadonlyMap<string, Staleness> {
  const service = useCalculationService();
  const [stale, setStale] = useState<ReadonlyMap<string, Staleness>>(new Map());
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const revision = projects.map((project) => `${project.id}@${project.updatedAt}`).join('|');

  useEffect(() => {
    let active = true;
    void (async () => {
      const next = new Map<string, Staleness>();
      for (const project of projectsRef.current) {
        if (!active) return;
        if (project.issue.locked || project.lastCalculation === null) continue;
        if ((await service.read(project.id, 'presizing')).status === 'stale') next.set(project.id, 'presizing');
        else if (project.sizingCalculation !== null && (await service.read(project.id, 'sizing')).status === 'stale') next.set(project.id, 'sizing');
      }
      if (active) setStale(next);
    })();
    return () => { active = false; };
  }, [revision, service]);

  return stale;
}
