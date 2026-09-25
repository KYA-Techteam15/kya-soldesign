import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useT } from '../../i18n';
import { useUi } from '../../store/ui';
import { useUsage } from '../../app/feedback/usage';
import { dateLong } from '../../domain/format';

/**
 * Avis et assistance (spec 012, FR-F1, FR-F3) : le consentement à l'usage anonyme, modifiable à
 * tout moment ; les avis envoyés et les réponses de l'équipe.
 */
export function FeedbackSection() {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const { consent, setConsent, threads, compose, refreshThreads } = useUsage();
  const hash = useLocation().hash;
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => { void refreshThreads(); }, [refreshThreads]);
  useEffect(() => { if (hash === '#avis') sectionRef.current?.scrollIntoView({ block: 'start' }); }, [hash]);

  return (
    <section className="kpis settings-group" id="avis" ref={sectionRef}>
      <div className="kpi kpi-head"><span className="h-sec">{t('feedback.section')}</span></div>
      <div className="kpi">
        <span>{t('usage.setting')}<small className="label asset-help">{t('usage.settingHelp')}</small></span>
        <span className="seg" role="radiogroup" aria-label={t('usage.setting')}>
          <button role="radio" aria-checked={consent === 'granted'} aria-selected={consent === 'granted'} onClick={() => setConsent('granted')}>{t('usage.accept')}</button>
          <button role="radio" aria-checked={consent === 'denied'} aria-selected={consent === 'denied'} onClick={() => setConsent('denied')}>{t('usage.decline')}</button>
        </span>
      </div>
      <div className="kpi">
        <span>{t('feedback.title')}<small className="label asset-help">{t('feedback.sectionHelp')}</small></span>
        <span className="asset-actions">
          <button type="button" className="btn" onClick={() => compose('idea')}>{t('feedback.title')}</button>
          <button type="button" className="btn" onClick={() => compose('problem')}>{t('support.report')}</button>
        </span>
      </div>
      {threads.length > 0 && <div className="kpi feedback-threads">
        <span>{t('feedback.threads')}</span>
        <ul>
          {threads.map((thread) => (
            <li key={thread.id} className="feedback-thread">
              <div className="feedback-thread-head">
                <b>{t(`feedback.kind.${thread.kind}`)}</b>
                <span className="label">{thread.id} · {dateLong(thread.createdAt, lang)}</span>
                <span className={`badge ${thread.status === 'answered' ? 'ok' : ''}`}>{t(`feedback.status.${thread.status}`)}</span>
              </div>
              <p>{thread.message}</p>
              {thread.replies.map((reply) => <blockquote key={reply.at} className="feedback-reply"><small className="label">{reply.author} · {dateLong(reply.at, lang)}</small>{reply.text}</blockquote>)}
            </li>
          ))}
        </ul>
      </div>}
    </section>
  );
}
