/**
 * Compatibility hook for the validated components.
 *
 * State ownership lives in ProjectSessionProvider and ProjectSessionPort. This
 * module intentionally exposes the copied selector API during the component-by-
 * component migration so the DOM and interaction structure remain unchanged.
 */
import { useProjectSession } from '../app/ProjectSessionProvider.js';

type Session = ReturnType<typeof useProjectSession>;

export function useProjects(): Session;
export function useProjects<Selected>(selector: (session: Session) => Selected): Selected;
export function useProjects<Selected>(selector?: (session: Session) => Selected): Session | Selected {
  const session = useProjectSession();
  return selector === undefined ? session : selector(session);
}

export const useCurrentProject = () => useProjectSession().current();
