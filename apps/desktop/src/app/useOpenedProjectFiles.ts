import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectSession } from './ProjectSessionProvider.js';
import { inspectProjectImport } from './models/projectTransfer.js';
import { listenForProjectFiles } from './platform/projectFiles.js';
import { fill, tr } from '../i18n/index.js';
import { useUi } from '../store/ui.js';

/**
 * Un double clic sur un fichier `.ksd` ouvre le projet : importé s'il est
 * nouveau, ouvert tel quel s'il est identique, et remplacé seulement après
 * confirmation s'il diffère de la version déjà présente.
 */
export function useOpenedProjectFiles(): void {
  const session = useProjectSession();
  const nav = useNavigate();
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => listenForProjectFiles(({ path, text }) => {
    const current = sessionRef.current;
    const { notify, ask } = useUi.getState();
    const inspection = inspectProjectImport(text, current.canonicalProjects);
    if (inspection.status === 'invalid') {
      notify({ kind: 'error', title: tr('projects.importFailed'), detail: `${path} · ${inspection.code}` });
      return;
    }
    const open = () => { void nav(`/projet/${inspection.project.id}/atelier/projet`); };
    if (inspection.status === 'valid-new') {
      current.addCanonical(inspection.project);
      notify({ kind: 'success', title: tr('projects.imported'), detail: inspection.project.name });
      open();
      return;
    }
    if (inspection.sameContent) { open(); return; }
    ask({
      title: tr('projects.conflictTitle'),
      message: fill(tr('projects.fileConflict'), { name: inspection.project.name }),
      confirmLabel: tr('projects.replace'),
      danger: true,
      onConfirm: () => { current.replaceCanonical(inspection.project); open(); },
    });
  }), [nav]);
}
