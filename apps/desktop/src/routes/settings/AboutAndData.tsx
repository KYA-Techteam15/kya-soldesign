import { useState, type ReactNode } from 'react';
import { applicationReleaseInfo } from '../../app/models/releaseInfo';
import { useProjectSession } from '../../app/ProjectSessionProvider';
import { planRestore, serializeBackup } from '../../app/services/projectBackup';
import { saveFile } from '../../app/platform/files';
import { fileTransfer } from '../../app/platform/fileTransfer';
import { openLogFolder, reportProblem } from '../../app/platform/support';
import { checkForUpdate, type UpdateCheck } from '../../app/platform/updates';
import { isTauri } from '../../app/platform/runtime';
import { Dialog } from '../../ui/Dialog';
import { dateLong } from '../../domain/format';
import { fill, useT } from '../../i18n';
import { useUi } from '../../store/ui';

type LegalDocument = 'license' | 'privacy' | 'notices';
const LEGAL_FILE: Record<LegalDocument, string> = { license: 'LICENSE.txt', privacy: 'PRIVACY.txt', notices: 'THIRD_PARTY_NOTICES.txt' };

function Group({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  return <section className="kpis settings-group"><div className="kpi kpi-head"><span className="h-sec">{title}</span></div>{children}</section>;
}

/** Sauvegarde et restauration de tous les projets, en un fichier. */
export function DataSection() {
  const t = useT();
  const { notify, ask } = useUi();
  const session = useProjectSession();
  const backup = async () => {
    const day = new Date().toISOString().slice(0, 10);
    const outcome = await saveFile({ suggestedName: `kya-sol-design-sauvegarde-${day}.ksdbackup`, data: serializeBackup(session.canonicalProjects, applicationReleaseInfo.version), mimeType: 'application/json', filter: { name: 'KYA-SolDesign', extensions: ['ksdbackup'] } });
    if (outcome.status === 'saved') notify({ kind: 'success', title: t('data.backupDone'), detail: fill(t('data.projectsCount'), { count: session.canonicalProjects.length }) });
  };
  const restore = async () => {
    const file = await fileTransfer.pickTextFile({ accept: '.ksdbackup,application/json' });
    if (!file) return;
    try {
      const plan = planRestore(file.text, session.canonicalProjects);
      ask({
        title: t('data.restoreTitle'),
        message: fill(t('data.restoreSummary'), { added: plan.added.length, replaced: plan.replaced.length, kept: plan.kept, unreadable: plan.unreadable }),
        confirmLabel: t('data.restore'),
        onConfirm: () => {
          for (const project of plan.added) session.addCanonical(project);
          for (const project of plan.replaced) session.replaceCanonical(project);
          notify({ kind: 'success', title: t('data.restoreDone') });
        },
      });
    } catch {
      notify({ kind: 'error', title: t('data.restoreFailed') });
    }
  };
  return (
    <Group title={t('data.title')}>
      <div className="kpi"><span>{t('data.backup')}<small className="label asset-help">{t('data.backupHelp')}</small></span><button type="button" className="btn" onClick={() => { void backup(); }}>{t('data.backupAction')}</button></div>
      <div className="kpi"><span>{t('data.restore')}<small className="label asset-help">{t('data.restoreHelp')}</small></span><button type="button" className="btn" onClick={() => { void restore(); }}>{t('data.restoreAction')}</button></div>
      {isTauri() && <div className="kpi"><span>{t('data.automatic')}<small className="label asset-help">{t('data.automaticHelp')}</small></span><span className="label">{t('data.automaticValue')}</span></div>}
    </Group>
  );
}

/** Version, historique, mises à jour, assistance et textes légaux. */
export function AboutSection() {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const notify = useUi((state) => state.notify);
  const [legal, setLegal] = useState<{ readonly kind: LegalDocument; readonly text: string } | null>(null);
  const [update, setUpdate] = useState<UpdateCheck | 'checking' | null>(null);
  const info = applicationReleaseInfo;

  const openLegal = async (kind: LegalDocument) => {
    try {
      const response = await fetch(`/legal/${LEGAL_FILE[kind]}`);
      setLegal({ kind, text: response.ok ? await response.text() : t('about.legalMissing') });
    } catch { setLegal({ kind, text: t('about.legalMissing') }); }
  };
  const report = async () => {
    const outcome = await reportProblem();
    if (outcome === 'copied') notify({ kind: 'info', title: t('support.reportCopied') });
    if (outcome === 'failed') notify({ kind: 'error', title: t('support.reportFailed') });
  };
  const check = async () => { setUpdate('checking'); setUpdate(await checkForUpdate()); };
  const updateLabel = update === null ? null : update === 'checking' ? t('about.updateChecking')
    : update.status === 'unconfigured' ? t('about.updateUnconfigured')
      : update.status === 'up-to-date' ? t('about.updateUpToDate')
        : update.status === 'error' ? `${t('about.updateError')} · ${update.message}`
          : fill(t('about.updateAvailable'), { version: update.version });

  return (
    <Group title={t('settings.about')}>
      <div className="kpi"><span>{t('settings.release')}</span><span className="label">{info.version} · {t(`about.channel.${info.channel}`)}{info.builtAtIso ? ` · ${t('about.builtOn')} ${dateLong(info.builtAtIso, lang)}` : ''}</span></div>
      <div className="kpi"><span>{t('about.updates')}{updateLabel && <small className="label asset-help">{updateLabel}</small>}</span><span className="asset-actions">
        {update !== null && update !== 'checking' && update.status === 'available'
          ? <button type="button" className="btn btn-primary" onClick={() => { void update.install(); }}>{t('about.updateInstall')}</button>
          : <button type="button" className="btn" disabled={update === 'checking'} onClick={() => { void check(); }}>{t('about.updateCheck')}</button>}
      </span></div>
      <details className="kpi"><summary>{t('settings.changelog')}</summary>{info.changelogEntries.map((entry) => <div key={entry.version}><b>{entry.version}</b> · {dateLong(entry.dateIso, lang)}<br /><span className="label">{entry.message[lang]}</span></div>)}</details>
      <div className="kpi"><span>{t('about.support')}<small className="label asset-help">{t('about.supportHelp')}</small></span><span className="asset-actions">
        <button type="button" className="btn" onClick={() => { void report(); }}>{t('support.report')}</button>
        {isTauri() && <button type="button" className="btn" onClick={() => { void openLogFolder(); }}>{t('support.openLogs')}</button>}
      </span></div>
      <div className="kpi"><span>{t('about.legal')}</span><span className="asset-actions">
        <button type="button" className="btn" onClick={() => { void openLegal('license'); }}>{t('about.license')}</button>
        <button type="button" className="btn" onClick={() => { void openLegal('privacy'); }}>{t('about.privacy')}</button>
        <button type="button" className="btn" onClick={() => { void openLegal('notices'); }}>{t('about.notices')}</button>
      </span></div>
      {legal && <Dialog title={t(`about.${legal.kind === 'notices' ? 'notices' : legal.kind}`)} wide onClose={() => setLegal(null)}><pre className="legal-text">{legal.text}</pre></Dialog>}
    </Group>
  );
}
