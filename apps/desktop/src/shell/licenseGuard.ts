import { useNavigate } from 'react-router-dom';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { fill, useT } from '../i18n';
import { licenseReadOnly, projectQuotaLeft } from '../app/licensing/licenseStore';
import { track } from '../app/feedback/usage';

/**
 * Garde commune aux entrées qui ajoutent un projet (nouveau, exemple, duplication, import) :
 * refus en lecture seule et au-delà du nombre de projets de l'édition, avec le motif et un lien
 * vers la licence.
 */
export function useProjectCreationGuard({ readOnlyAllowed = false }: { readonly readOnlyAllowed?: boolean } = {}): (proceed: () => void) => void {
  const t = useT();
  const nav = useNavigate();
  const notify = useUi((state) => state.notify);
  const count = useProjects((session) => session.projects.length);
  return (proceed) => {
    const action = { label: t('license.open'), run: () => { void nav('/reglages#licence'); } };
    // Importer pour consulter reste permis en lecture seule (P-7) ; créer, non.
    if (!readOnlyAllowed && licenseReadOnly()) { track('license.blocked', { reason: 'readOnly' }); notify({ kind: 'warning', title: t('license.blocked.readOnly'), action }); return; }
    const left = projectQuotaLeft(count);
    if (left === 0) { track('license.blocked', { reason: 'projects' }); notify({ kind: 'warning', title: t('license.blocked.projects'), detail: fill(t('license.blocked.projectsDetail'), { count }), action }); return; }
    proceed();
  };
}
