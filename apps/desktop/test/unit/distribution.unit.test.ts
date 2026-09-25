import { describe, expect, it } from 'vitest';
import { menuTemplate, parseMenuId, RECENT_LIMIT, type MenuEntry } from '../../src/app/platform/nativeMenu.js';
import { diagnosticContext } from '../../src/app/platform/diagnostics.js';
import { diagnosticReport } from '../../src/app/platform/logger.js';
import { checkForUpdate, updateChannels } from '../../src/app/platform/updates.js';
import { translate } from '../../src/i18n/index.js';

const t = (key: string) => translate(key, 'fr');

function flatten(entries: readonly MenuEntry[]): MenuEntry[] {
  return entries.flatMap((entry) => ('items' in entry ? [entry, ...flatten(entry.items)] : [entry]));
}
const byId = (entries: readonly MenuEntry[], id: string) => flatten(entries).find((entry) => 'id' in entry && entry.id === id);

describe('native menu (spec 012, FR-E3)', () => {
  it('offers the usual shortcuts, in the interface language', () => {
    const menu = menuTemplate(t, [], true);
    expect(menu.map((entry) => ('text' in entry ? entry.text : ''))).toEqual(['Fichier', 'Aide']);
    expect(byId(menu, 'new')).toMatchObject({ accelerator: 'CmdOrCtrl+N' });
    expect(byId(menu, 'open')).toMatchObject({ accelerator: 'CmdOrCtrl+O' });
    expect(byId(menu, 'export')).toMatchObject({ accelerator: 'CmdOrCtrl+S', enabled: true });
    expect(menuTemplate((key) => translate(key, 'en'), [], true)[0]).toMatchObject({ text: 'File' });
  });

  it('greys out export when no project is open', () => {
    expect(byId(menuTemplate(t, [], false), 'export')).toMatchObject({ enabled: false });
  });

  it('lists recent projects, capped, and says when there are none', () => {
    const recent = Array.from({ length: 12 }, (_, index) => ({ id: `p${index}`, name: `Projet ${index}` }));
    const items = flatten(menuTemplate(t, recent, false)).filter((entry) => 'id' in entry && entry.id.startsWith('recent:'));
    expect(items).toHaveLength(RECENT_LIMIT);
    expect(byId(menuTemplate(t, [], false), 'recent-empty')).toMatchObject({ enabled: false, text: 'Aucun projet récent' });
  });

  it('maps every entry back to a command or a project', () => {
    for (const entry of flatten(menuTemplate(t, [{ id: 'abc', name: 'A' }], true))) {
      if (!('id' in entry) || entry.id === 'recent-empty') continue;
      expect(parseMenuId(entry.id), entry.id).not.toBeNull();
    }
    expect(parseMenuId('recent:abc')).toEqual({ recent: 'abc' });
    expect(parseMenuId('unknown')).toBeNull();
  });
});

describe('diagnostics and updates outside the desktop host', () => {
  it('describes the environment without any project content', () => {
    const report = diagnosticReport(diagnosticContext({ projectCount: 3, lang: 'fr' }));
    expect(report).toContain('Host: browser');
    expect(report).toContain('Projects: 3');
    expect(report).toContain('Language: fr');
    expect(report).toContain('License:');
  });

  it('reports updates as not configured rather than up to date', async () => {
    expect(await updateChannels()).toEqual([]);
    expect(await checkForUpdate('stable')).toEqual({ status: 'unconfigured' });
  });
});
