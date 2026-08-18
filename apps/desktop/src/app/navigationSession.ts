export const NAVIGATION_SESSION_STORAGE_KEY = 'kya-sol-design.navigation.v1';

export interface NavigationSessionV1 {
  readonly version: 1;
  readonly currentProjectId: string | null;
  readonly route: string | null;
  readonly search: string;
  readonly activeProfileId: string | null;
  readonly dossierView: string | null;
}

type NavigationStorage = Pick<Storage, 'getItem' | 'setItem'>;

const emptySession: NavigationSessionV1 = {
  version: 1,
  currentProjectId: null,
  route: null,
  search: '',
  activeProfileId: null,
  dossierView: null,
};

const workshopSlugs = new Set(['projet', 'site', 'besoins', 'hypotheses', 'materiel', 'protections', 'chiffrage', 'dossier']);

export function readNavigationSession(
  projects: readonly { readonly id: string }[],
  storage: NavigationStorage = window.localStorage,
): NavigationSessionV1 {
  try {
    const raw = storage.getItem(NAVIGATION_SESSION_STORAGE_KEY);
    if (raw === null) return emptySession;
    const value = JSON.parse(raw) as Partial<NavigationSessionV1>;
    if (value.version !== 1) return emptySession;
    const currentProjectId = typeof value.currentProjectId === 'string'
      && projects.some((project) => project.id === value.currentProjectId)
      ? value.currentProjectId
      : null;
    return {
      version: 1,
      currentProjectId,
      route: typeof value.route === 'string' && isWorkshopRoute(value.route, currentProjectId) ? value.route : null,
      search: typeof value.search === 'string' ? value.search : '',
      activeProfileId: typeof value.activeProfileId === 'string' ? value.activeProfileId : null,
      dossierView: typeof value.dossierView === 'string' ? value.dossierView : null,
    };
  } catch {
    return emptySession;
  }
}

export function writeNavigationSession(
  session: NavigationSessionV1,
  storage: NavigationStorage = window.localStorage,
): void {
  storage.setItem(NAVIGATION_SESSION_STORAGE_KEY, JSON.stringify(session));
}

function isWorkshopRoute(route: string, projectId: string | null): boolean {
  if (projectId === null) return false;
  const parts = route.split('/');
  return parts.length === 5 && parts[1] === 'projet' && parts[2] === projectId && parts[3] === 'atelier' && workshopSlugs.has(parts[4] ?? '');
}
