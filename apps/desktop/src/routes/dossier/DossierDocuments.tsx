import { useEffect, useRef, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { FinanceOutputV1, SizingOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../../app/models/projectView';
import { ReportA4, type DocKind } from './ReportA4';
import { assessDocumentReadiness, type DocumentReadiness } from '../../app/models/documentReadiness';
import { useUi } from '../../store/ui';
import { useT } from '../../i18n';

const DOCS: { key: DocKind; labelKey: string; noteKey: string }[] = [
  { key: 'rapport', labelKey: 'documents.report', noteKey: 'documents.reportNote' },
  { key: 'offre', labelKey: 'documents.offer', noteKey: 'documents.offerNote' },
  { key: 'proforma', labelKey: 'documents.proforma', noteKey: 'documents.proformaNote' },
  { key: 'dossier_exec', labelKey: 'documents.execution', noteKey: 'documents.executionNote' },
];

export function DossierDocuments({ project, sizing, finance, catalog }: { project: ProjectViewModel; sizing: SizingOutputV1 | null; finance: FinanceOutputV1 | null; catalog: readonly Equipment[] }) {
  const t = useT(); const { ask } = useUi(); const [preview, setPreview] = useState<DocKind>('rapport'); const [readiness, setReadiness] = useState<DocumentReadiness>(() => assessDocumentReadiness(project, 'rapport', sizing, finance)); const paperRef = useRef<HTMLDivElement>(null); const first = useRef(true);
  useEffect(() => { if (!first.current) paperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); first.current = false; }, [preview]);
  const selectPreview = (kind: DocKind) => { setPreview(kind); setReadiness(assessDocumentReadiness(project, kind, sizing, finance)); };
  const print = (kind: DocKind) => { setPreview(kind); const next = assessDocumentReadiness(project, kind, sizing, finance); setReadiness(next); if (next.blockers.length > 0) return; if (next.warnings.length > 0) { ask({ title: t('documents.readiness.warningTitle'), message: next.warnings.map((warning) => t(warning.messageKey)).join(' · '), confirmLabel: t('documents.readiness.continue'), onConfirm: () => window.setTimeout(() => window.print(), 120) }); return; } window.setTimeout(() => window.print(), 120); };
  return <><div className="proj-list">{DOCS.map((doc) => <div className="proj-row" key={doc.key}><button style={{ textAlign: 'left' }} onClick={() => selectPreview(doc.key)}><b>{t(doc.labelKey)}</b><small>{t(doc.noteKey)}</small></button><span className="when">{t('documents.a4Pages')}</span><button className="btn" aria-pressed={preview === doc.key} onClick={() => selectPreview(doc.key)}>{t('documents.preview')}</button><button className="btn btn-icon" aria-label={`${t('documents.print')} ${t(doc.labelKey)}`} title={`${t('documents.print')} ${t(doc.labelKey)}`} onClick={() => print(doc.key)}>⎙</button></div>)}</div><div className="paper-wrap" ref={paperRef}><div className="rowline no-print"><h2 className="h-sec">{t('documents.previewBeforePrint')}</h2><span className="sep" /><span className="label">{t('documents.a4Pages')}</span><button className="btn" onClick={() => print(preview)}>{t('documents.printPdf')}</button></div>{(readiness.blockers.length > 0 || readiness.warnings.length > 0) && <div className={`document-readiness ${readiness.blockers.length > 0 ? 'is-blocked' : ''}`} role="status"><b>{readiness.blockers.length > 0 ? t('documents.readiness.blocked') : t('documents.readiness.warnings')}</b>{readiness.blockers.concat(readiness.warnings).map((issue) => <span key={issue.code}>{t(issue.messageKey)}</span>)}</div>}<ReportA4 project={project} kind={preview} sizing={sizing} finance={finance} catalog={catalog} /></div></>;
}
