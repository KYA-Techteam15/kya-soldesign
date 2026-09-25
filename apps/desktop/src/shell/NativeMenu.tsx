import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { useT } from '../i18n';
import { closeMainWindow, installNativeMenu, menuTemplate, parseMenuId, RECENT_LIMIT, type MenuCommand } from '../app/platform/nativeMenu';
import { copyDiagnostics } from '../app/platform/diagnostics';
import { openLogFolder } from '../app/platform/support';
import { useUsage } from '../app/feedback/usage';
import { isTauri } from '../app/platform/runtime';
import { useProjectTransfer } from '../routes/ImportProjectButton';
import { useProjectCreationGuard } from './licenseGuard';
import { useUpdates } from './UpdateNotice';

/**
 * Menu natif de la fenêtre de bureau (spec 012, FR-E3). Il se reconstruit quand la langue ou la
 * liste des projets récents change ; ses commandes passent par les mêmes chemins que l'interface
 * (garde de licence, import, export, recherche de mise à jour).
 */
export function NativeMenu() {
  const t = useT();
  const nav = useNavigate();
  const location = useLocation();
  const { projects, create } = useProjects();
  const { notify, ask, lang } = useUi();
  const transfer = useProjectTransfer();
  const guard = useProjectCreationGuard();
  const guardImport = useProjectCreationGuard({ readOnlyAllowed: true });
  const runUpdateCheck = useUpdates((state) => state.run);
  const compose = useUsage((state) => state.compose);
  const currentId = location.pathname.match(/^\/projet\/([^/]+)/u)?.[1] ?? null;

  const recent = useMemo(() => [...projects]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, RECENT_LIMIT)
    .map((project) => ({ id: project.id, name: project.name || t('menu.untitled') })), [projects, t]);

  /* Les commandes lisent l'état le plus récent : le menu, lui, n'est reposé que si son contenu change. */
  const handlers = useRef<(command: MenuCommand) => void>(() => undefined);
  handlers.current = (command) => {
    switch (command) {
      case 'new': guard(() => { void nav(`/projet/${create('standalone_all_in_one')}/atelier/projet`); }); break;
      case 'open': guardImport(() => { void openProject(); }); break;
      case 'export':
        if (currentId === null) { notify({ kind: 'info', title: t('menu.exportNoProject') }); break; }
        void transfer.export(currentId).then(() => notify({ kind: 'success', title: t('projects.exported') }))
          .catch((error: unknown) => notify({ kind: 'error', title: t('projects.exportFailed'), detail: error instanceof Error ? error.message : '' }));
        break;
      case 'projects': void nav('/accueil/projets'); break;
      case 'settings': void nav('/reglages'); break;
      case 'quit': void closeMainWindow(); break;
      case 'checkUpdates': void runUpdateCheck(true); break;
      case 'openLogs': void openLogFolder(); break;
      case 'copyDiagnostics':
        void copyDiagnostics({ projectCount: projects.length, lang }).then((copied) => notify(copied ? { kind: 'success', title: t('support.diagnosticsCopied') } : { kind: 'error', title: t('support.reportFailed') }));
        break;
      case 'report': compose('problem'); break;
      case 'feedback': compose('idea'); break;
      case 'about': void nav('/reglages#apropos'); break;
    }
  };

  const openProject = async () => {
    try {
      const result = await transfer.inspectImport();
      if (!result) return;
      const inspection = result.inspection;
      if (inspection.status === 'invalid') { notify({ kind: 'error', title: t('projects.importFailed'), detail: inspection.code }); return; }
      if (inspection.status === 'valid-conflict') {
        // Le projet existe déjà : le menu en importe une copie ; le remplacer se décide depuis la liste des projets.
        ask({ title: t('projects.conflictTitle'), message: t('projects.conflictMessage'), confirmLabel: t('projects.copy'), onConfirm: () => { transfer.commitImport(inspection, 'copy'); notify({ kind: 'success', title: t('projects.copied') }); } });
        return;
      }
      transfer.commitImport(inspection, 'replace');
      notify({ kind: 'success', title: t('projects.imported') });
    } catch (error) {
      notify({ kind: 'error', title: t('projects.importFailed'), detail: error instanceof Error ? error.message : '' });
    }
  };

  const template = useMemo(() => menuTemplate(t, recent, currentId !== null), [t, recent, currentId]);
  const signature = JSON.stringify(template);
  useEffect(() => {
    if (!isTauri()) return;
    void installNativeMenu(template, (id) => {
      const target = parseMenuId(id);
      if (target === null) return;
      if ('recent' in target) void nav(`/projet/${target.recent}/atelier/projet`);
      else handlers.current(target.command);
    });
    // Le gabarit est comparé par son contenu (`signature`) : un nouveau rendu identique ne repose pas le menu.
  }, [signature, nav]);

  return null;
}
