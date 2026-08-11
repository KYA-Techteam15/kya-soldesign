import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../../src/shared/i18n/I18nProvider.js';
import { CapabilityStateView } from '../../src/shared/status/CapabilityStateView.js';
import { Dialog } from '../../src/shared/ui/Dialog.js';
import { Tabs } from '../../src/shared/ui/Tabs.js';
import { TextField } from '../../src/shared/ui/Field.js';
import { ToastRegion } from '../../src/shared/ui/ToastRegion.js';

describe('shared UI semantic contracts', () => {
  it('renders a modal dialog with an accessible name', () => {
    const html = renderToStaticMarkup(<Dialog open title="Confirm" onClose={() => undefined}><button>Continue</button></Dialog>);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toMatch(/aria-labelledby="([^"]+)"/);
  });

  it('connects invalid fields to their alert', () => {
    const html = renderToStaticMarkup(<TextField label="Power" error="Required" />);
    expect(html).toContain('aria-invalid="true"');
    expect(html).toMatch(/aria-describedby="([^"]+)"/);
    expect(html).toContain('role="alert"');
  });

  it('exposes tabs, polite notifications, and owned capability status', () => {
    const html = renderToStaticMarkup(<I18nProvider locale="fr"><Tabs items={[{ id: 'one', label: 'One' }, { id: 'two', label: 'Two' }]} activeId="one" onChange={() => undefined} /><ToastRegion messages={[{ id: 'saved', message: 'Saved' }]} /><CapabilityStateView state={{ status: 'unavailable', roadmapOwner: 'AIO-001', messageKey: 'state.unavailable' }} /></I18nProvider>);
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('AIO-001');
  });
});
