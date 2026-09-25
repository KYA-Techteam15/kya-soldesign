import { logger } from './logger.js';
import { isTauri } from './runtime.js';

/**
 * Menu natif de la fenêtre (spec 012, FR-E3) : Fichier et Aide, raccourcis Ctrl+N / Ctrl+O / Ctrl+S,
 * projets récents. Le gabarit est une description pure, construite dans la langue de l'interface
 * et testée sans hôte ; `installNativeMenu` la confie à Tauri.
 */
export type MenuCommand =
  | 'new' | 'open' | 'export' | 'projects' | 'settings' | 'quit'
  | 'checkUpdates' | 'openLogs' | 'copyDiagnostics' | 'feedback' | 'report' | 'about';

export type MenuEntry =
  | { readonly id: string; readonly text: string; readonly accelerator?: string; readonly enabled?: boolean }
  | { readonly item: 'Separator' }
  | { readonly text: string; readonly items: readonly MenuEntry[] };

export interface RecentProject { readonly id: string; readonly name: string }

/** Nombre de projets récents proposés dans le menu. */
export const RECENT_LIMIT = 8;
const RECENT_PREFIX = 'recent:';

export function menuTemplate(t: (key: string) => string, recent: readonly RecentProject[], hasProject: boolean): MenuEntry[] {
  const recentItems: MenuEntry[] = recent.length === 0
    ? [{ id: 'recent-empty', text: t('menu.recentEmpty'), enabled: false }]
    : recent.slice(0, RECENT_LIMIT).map((project) => ({ id: `${RECENT_PREFIX}${project.id}`, text: project.name }));
  return [
    {
      text: t('menu.file'),
      items: [
        { id: 'new', text: t('menu.newProject'), accelerator: 'CmdOrCtrl+N' },
        { id: 'open', text: t('menu.open'), accelerator: 'CmdOrCtrl+O' },
        { text: t('menu.recent'), items: recentItems },
        { item: 'Separator' },
        { id: 'export', text: t('menu.export'), accelerator: 'CmdOrCtrl+S', enabled: hasProject },
        { id: 'projects', text: t('menu.projects') },
        { item: 'Separator' },
        { id: 'settings', text: t('home.settings') },
        { item: 'Separator' },
        { id: 'quit', text: t('menu.quit') },
      ],
    },
    {
      text: t('menu.help'),
      items: [
        { id: 'checkUpdates', text: t('about.updateCheck') },
        { item: 'Separator' },
        { id: 'feedback', text: t('feedback.title') },
        { id: 'report', text: t('support.report') },
        { id: 'copyDiagnostics', text: t('support.copyDiagnostics') },
        { id: 'openLogs', text: t('support.openLogs') },
        { item: 'Separator' },
        { id: 'about', text: t('menu.about') },
      ],
    },
  ];
}

/** Commande ou projet récent désigné par l'identifiant d'une entrée. */
export function parseMenuId(id: string): { readonly command: MenuCommand } | { readonly recent: string } | null {
  if (id.startsWith(RECENT_PREFIX)) return { recent: id.slice(RECENT_PREFIX.length) };
  const commands: readonly MenuCommand[] = ['new', 'open', 'export', 'projects', 'settings', 'quit', 'checkUpdates', 'openLogs', 'copyDiagnostics', 'feedback', 'report', 'about'];
  return (commands as readonly string[]).includes(id) ? { command: id as MenuCommand } : null;
}

type TauriEntry = { id: string; text: string; accelerator?: string; enabled?: boolean; action: (id: string) => void } | { item: 'Separator' } | { text: string; items: TauriEntry[] };

function withAction(entry: MenuEntry, onSelect: (id: string) => void): TauriEntry {
  if ('item' in entry) return { item: 'Separator' };
  if ('items' in entry) return { text: entry.text, items: entry.items.map((child) => withAction(child, onSelect)) };
  return { ...entry, action: onSelect };
}

/** « Quitter » : ferme la fenêtre principale, ce qui termine l'application. */
export async function closeMainWindow(): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().close();
}

/** Pose le menu sur la fenêtre. Hors hôte de bureau, rien : l'application web a sa barre du haut. */
export async function installNativeMenu(template: readonly MenuEntry[], onSelect: (id: string) => void): Promise<void> {
  if (!isTauri()) return;
  try {
    const { Menu } = await import('@tauri-apps/api/menu');
    const menu = await Menu.new({ items: template.map((entry) => withAction(entry, onSelect)) });
    await menu.setAsAppMenu();
  } catch (error) {
    logger.warn('menu.install', error);
  }
}
