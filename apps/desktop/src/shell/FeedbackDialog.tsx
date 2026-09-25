import { useEffect, useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { useT } from '../i18n';
import { useUi } from '../store/ui';
import { useUsage } from '../app/feedback/usage';
import type { FeedbackKind } from '../app/feedback/usageApi';
import { diagnosticContext } from '../app/platform/diagnostics';
import { diagnosticReport } from '../app/platform/logger';

const KINDS: readonly FeedbackKind[] = ['idea', 'problem', 'question'];
const MIN_LENGTH = 10;

/**
 * « Donner un avis » et « Signaler un problème » (spec 012, FR-F3) : le message part vers la
 * plateforme, avec, pour un problème, les infos de diagnostic si l'utilisateur les joint. Les
 * réponses s'affichent dans Réglages → Avis et assistance.
 */
export function FeedbackDialog() {
  const t = useT();
  const { notify, lang } = useUi();
  const composing = useUsage((state) => state.composing);
  const close = useUsage((state) => state.closeComposer);
  const submit = useUsage((state) => state.submit);
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [attach, setAttach] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (composing === null) return;
    setKind(composing);
    setMessage('');
    setAttach(composing === 'problem');
  }, [composing]);

  if (composing === null) return null;
  const tooShort = message.trim().length < MIN_LENGTH;
  const contactInvalid = contact.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(contact.trim());

  const send = async () => {
    if (tooShort || contactInvalid) return;
    setSending(true);
    const sent = await submit({ kind, message: message.trim(), contact: contact.trim(), diagnostics: kind === 'problem' && attach ? diagnosticReport(diagnosticContext({ lang })) : null });
    setSending(false);
    notify(sent ? { kind: 'success', title: t('feedback.sent'), detail: t('feedback.sentDetail') } : { kind: 'error', title: t('feedback.failed') });
  };

  return (
    <Dialog
      title={t(kind === 'problem' ? 'support.report' : 'feedback.title')}
      lead={t('feedback.lead')}
      onClose={close}
      footer={<>
        <button className="btn" onClick={close} disabled={sending}>{t('g.cancel')}</button>
        <button className="btn btn-primary" onClick={() => { void send(); }} disabled={sending || tooShort || contactInvalid}>{sending ? t('feedback.sending') : t('feedback.send')}</button>
      </>}
    >
      <div className="feedback-form">
        <div className="seg" role="radiogroup" aria-label={t('feedback.kind')}>
          {KINDS.map((value) => <button key={value} role="radio" aria-checked={kind === value} aria-selected={kind === value} onClick={() => setKind(value)}>{t(`feedback.kind.${value}`)}</button>)}
        </div>
        <label className="docs-field"><span>{t('feedback.message')}</span>
          <textarea rows={6} value={message} placeholder={t(`feedback.placeholder.${kind}`)} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <label className="docs-field"><span>{t('feedback.contact')}<small className="label">{t('feedback.contactHelp')}</small></span>
          <input type="email" value={contact} aria-invalid={contactInvalid} onChange={(event) => setContact(event.target.value)} />
        </label>
        {kind === 'problem' && <label className="generate-switch">
          <input type="checkbox" checked={attach} onChange={(event) => setAttach(event.target.checked)} />
          <span>{t('feedback.attachDiagnostics')}<small className="label">{t('feedback.attachDiagnosticsHelp')}</small></span>
        </label>}
      </div>
    </Dialog>
  );
}
