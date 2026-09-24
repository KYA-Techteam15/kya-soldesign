import { useState } from 'react';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { useT } from '../i18n';
import { fileTransfer } from '../app/platform/fileTransfer';
import { applicationReleaseInfo } from '../app/models/releaseInfo';
import { ProjectTransferService } from '../app/services/projectTransfer';
import type { ImportInspection } from '../app/models/projectTransfer';

/** Import d'un fichier .ksd, avec le choix remplacer / copier quand le projet existe déjà. */
export function useProjectTransfer() {
  const session = useProjects();
  return new ProjectTransferService({ list: () => session.canonicalProjects, get: (id) => session.canonicalProjects.find((project) => project.id === id) ?? null, add: session.addCanonical, replace: session.replaceCanonical }, fileTransfer, applicationReleaseInfo.version);
}

export function ImportProjectButton({ label, className = 'btn' }: { readonly label?: string; readonly className?: string }) {
  const t = useT();
  const { notify } = useUi();
  const transfer = useProjectTransfer();
  const [pending, setPending] = useState<ImportInspection | null>(null);

  const importProject = async () => {
    try {
      const result = await transfer.inspectImport();
      if (!result) return;
      if (result.inspection.status === 'invalid') notify({ kind: 'error', title: t('projects.importFailed'), detail: result.inspection.code });
      else if (result.inspection.status === 'valid-conflict') setPending(result.inspection);
      else { transfer.commitImport(result.inspection, 'replace'); notify({ kind: 'success', title: t('projects.imported') }); }
    } catch (error) {
      notify({ kind: 'error', title: t('projects.importFailed'), detail: error instanceof Error ? error.message : t('settings.invalid') });
    }
  };

  return <>
    <button className={className} onClick={() => { void importProject(); }}>{label ?? t('projects.import')}</button>
    {pending?.status === 'valid-conflict' && <div className="confirm-inline" role="dialog" aria-labelledby="project-conflict-title"><b id="project-conflict-title">{t('projects.conflictTitle')}</b><p>{t('projects.conflictMessage')}</p><div className="rowline"><button className="btn btn-primary" onClick={() => { transfer.commitImport(pending, 'replace'); setPending(null); notify({ kind: 'success', title: t('projects.imported') }); }}>{t('projects.replace')}</button><button className="btn" onClick={() => { transfer.commitImport(pending, 'copy'); setPending(null); notify({ kind: 'success', title: t('projects.copied') }); }}>{t('projects.copy')}</button><button className="btn" onClick={() => setPending(null)}>{t('g.cancel')}</button></div></div>}
  </>;
}
