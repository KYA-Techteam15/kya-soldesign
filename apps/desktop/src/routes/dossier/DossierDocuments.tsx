import { useEffect, useRef, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { FinanceOutputV1, PresizingOutputV1, SizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../../app/models/projectView';
import { ReportA4 } from './ReportA4';
import { GenerateDialog } from './GenerateDialog';
import { assessDocumentReadiness, type DocumentReadiness } from '../../app/models/documentReadiness';
import { useUi } from '../../store/ui';
import { useSettings } from '../../store/settings';
import { translate, useT } from '../../i18n';
import { useReportAssetUrl } from '../../app/adapters/reportAssetRepository';
import { buildReportDocument } from '../../app/export/reportModel';
import { downloadDocx } from '../../app/export/docxWriter';
import { buildProjectDiagram } from '../../app/diagram/projectDiagram';
import { defaultReportOptions, type DocKind, type ReportOptions } from '../../app/export/documentComposition';

const DOCS: { key: DocKind; labelKey: string; noteKey: string }[] = [
  { key: 'rapport', labelKey: 'documents.report', noteKey: 'documents.reportNote' },
  { key: 'offre', labelKey: 'documents.offer', noteKey: 'documents.offerNote' },
  { key: 'proforma', labelKey: 'documents.proforma', noteKey: 'documents.proformaNote' },
  { key: 'dossier_exec', labelKey: 'documents.execution', noteKey: 'documents.executionNote' },
];

/**
 * Pièces proposées à l'écran.
 *
 * L'offre interne et le dossier d'exécution restent construits et testés —
 * leur composition, leurs sections et leurs garde-fous sont en place — mais ils
 * ne sont pas encore présentables. On retire les boutons plutôt que de livrer
 * une pièce qu'on ne veut pas voir sortir ; remettre la clé dans cette liste
 * suffira à les rouvrir.
 */
const PUBLISHED: readonly DocKind[] = ['rapport', 'proforma'];
const SHOWN = DOCS.filter((doc) => PUBLISHED.includes(doc.key));

/** Ce que le dialogue de génération produira une fois validé. */
type PendingAction = { readonly kind: DocKind; readonly action: 'word' | 'print' };

export function DossierDocuments({ project, sizing, finance, solar, presizing, catalog }: {
  project: ProjectViewModel;
  sizing: SizingOutputV1 | null;
  finance: FinanceOutputV1 | null;
  solar: SolarResourceAnalysisOutputV1 | null;
  presizing: PresizingOutputV1 | null;
  catalog: readonly Equipment[];
}) {
  const t = useT();
  const { ask } = useUi();
  const settings = useSettings();
  const lang = useUi((state) => state.lang);
  const [preview, setPreview] = useState<DocKind>('rapport');
  const [readiness, setReadiness] = useState<DocumentReadiness>(() => assessDocumentReadiness(project, 'rapport', sizing, finance));
  const paperRef = useRef<HTMLDivElement>(null);
  const first = useRef<DocKind | null>(null);
  const logoUrl = useReportAssetUrl(settings.reports.logoAssetId);
  const coverUrl = useReportAssetUrl(settings.reports.coverAssetId);
  const signatureUrl = useReportAssetUrl(settings.reports.signatureAssetId);
  const [busy, setBusy] = useState<DocKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  /* Le Word doit recevoir le même visuel que l'aperçu, repli compris. */
  const effectiveLogoUrl = logoUrl || settings.reports.logoUrl || '/kya-sol-design-logo.png';

  /**
   * Composition retenue par pièce, pour la durée de la séance. Une composition
   * réglée puis perdue au changement d'onglet obligerait à la refaire à chaque
   * tirage ; elle ne va pas pour autant dans les réglages, qui décrivent
   * l'entreprise et pas le document du jour.
   */
  const [composition, setComposition] = useState<Partial<Record<DocKind, ReportOptions>>>({});
  const optionsFor = (kind: DocKind): ReportOptions => composition[kind] ?? defaultReportOptions(kind, lang);

  /**
   * Export Word. Le document reprend l'aperçu section pour section ; seule la
   * planche change de nature, Word ne posant pas de SVG.
   */
  const word = async (kind: DocKind, options: ReportOptions) => {
    setBusy(kind);
    setError(null);
    try {
      const generated = sizing
        ? buildProjectDiagram({ project, sizing, catalog, settings, lang: options.lang })
        : null;
      await downloadDocx(buildReportDocument({
        project, kind, sizing, finance, solar, presizing, catalog, settings,
        t: (key: string) => translate(key, options.lang),
        assets: { logoUrl: effectiveLogoUrl, coverUrl, signatureUrl },
        options,
        diagram: generated ? { svg: generated.svg, width: generated.plan.width, height: generated.plan.height, bom: generated.plan.bom } : null,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('documents.exportFailed'));
    } finally {
      setBusy(null);
    }
  };

  // On ne défile vers l'aperçu qu'après un vrai changement de document. Le
  // repère est le document lui-même : un drapeau booléen serait consommé deux
  // fois par le double montage de StrictMode, et l'écran s'ouvrirait défilé
  // sous la liste des pièces — c'est-à-dire sans son action principale.
  useEffect(() => {
    if (first.current !== preview) paperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    first.current = preview;
  }, [preview]);

  const selectPreview = (kind: DocKind) => {
    setPreview(kind);
    setReadiness(assessDocumentReadiness(project, kind, sizing, finance));
  };

  const print = (kind: DocKind) => {
    setPreview(kind);
    const next = assessDocumentReadiness(project, kind, sizing, finance);
    setReadiness(next);
    if (next.blockers.length > 0) return;
    const fire = () => window.setTimeout(() => window.print(), 120);
    if (next.warnings.length > 0) {
      ask({
        title: t('documents.readiness.warningTitle'),
        message: next.warnings.map((warning) => t(warning.messageKey)).join(' · '),
        confirmLabel: t('documents.readiness.continue'),
        onConfirm: fire,
      });
      return;
    }
    fire();
  };

  const confirmPending = (options: ReportOptions) => {
    if (pending === null) return;
    setComposition((current) => ({ ...current, [pending.kind]: options }));
    const action = pending.action;
    const kind = pending.kind;
    setPending(null);
    if (action === 'word') void word(kind, options);
    else { selectPreview(kind); print(kind); }
  };

  return <>
    <div className="proj-list">{SHOWN.map((doc) => <div className="proj-row" key={doc.key}>
      <button style={{ textAlign: 'left' }} onClick={() => selectPreview(doc.key)}>
        <b>{t(doc.labelKey)}</b><small>{t(doc.noteKey)}</small>
      </button>
      <span className="when">{t('documents.pageCount')}</span>
      <button className="btn" aria-pressed={preview === doc.key} onClick={() => selectPreview(doc.key)}>{t('documents.preview')}</button>
      <button className="btn" onClick={() => setPending({ kind: doc.key, action: 'word' })}>{t('documents.configure')}</button>
      <button
        className="btn"
        disabled={busy !== null}
        aria-label={`${t('documents.exportWord')} ${t(doc.labelKey)}`}
        title={`${t('documents.exportWord')} ${t(doc.labelKey)}`}
        onClick={() => { void word(doc.key, optionsFor(doc.key)); }}
      >{busy === doc.key ? t('documents.exporting') : t('documents.word')}</button>
      <button
        className="btn btn-icon"
        aria-label={`${t('documents.print')} ${t(doc.labelKey)}`}
        title={`${t('documents.print')} ${t(doc.labelKey)}`}
        onClick={() => print(doc.key)}
      >⎙</button>
    </div>)}</div>

    {error !== null && <div className="document-readiness is-blocked" role="status">
      <b>{t('documents.exportFailed')}</b><span>{error}</span>
    </div>}

    <div className="paper-wrap" ref={paperRef}>
      <div className="rowline no-print">
        <h2 className="h-sec">{t('documents.previewBeforePrint')}</h2>
        <span className="sep" />
        <span className="label">{t('documents.pageCount')}</span>
        <button className="btn" onClick={() => setPending({ kind: preview, action: 'print' })}>{t('documents.configure')}</button>
        <button className="btn" onClick={() => print(preview)}>{t('documents.printPdf')}</button>
      </div>
      {(readiness.blockers.length > 0 || readiness.warnings.length > 0) && <div className={`document-readiness ${readiness.blockers.length > 0 ? 'is-blocked' : ''}`} role="status">
        <b>{readiness.blockers.length > 0 ? t('documents.readiness.blocked') : t('documents.readiness.warnings')}</b>
        {readiness.blockers.concat(readiness.warnings).map((issue) => <span key={issue.code}>{t(issue.messageKey)}</span>)}
      </div>}
      <ReportA4
        project={project}
        kind={preview}
        sizing={sizing}
        finance={finance}
        solar={solar}
        presizing={presizing}
        catalog={catalog}
        options={optionsFor(preview)}
      />
    </div>

    {pending !== null && <GenerateDialog
      kind={pending.kind}
      initial={optionsFor(pending.kind)}
      confirmLabel={pending.action === 'word' ? t('generate.confirmWord') : t('generate.confirmPrint')}
      onCancel={() => setPending(null)}
      onConfirm={confirmPending}
    />}
  </>;
}
