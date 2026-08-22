import { useEffect, useRef, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { FinanceOutputV1, SizingOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from '../../app/models/projectView';
import { ReportA4, type DocKind } from './ReportA4';

const DOCS: { key: DocKind; label: string; note: string }[] = [
  { key: 'rapport', label: 'Rapport technique & commercial', note: 'Remis au client' },
  { key: 'offre', label: 'Offre technique interne', note: 'Usage interne' },
  { key: 'proforma', label: 'Facture proforma', note: 'Remise au client' },
  { key: 'dossier_exec', label: "Dossier d'exécution", note: 'Nomenclature de mise en œuvre' },
];

export function DossierDocuments({ project, sizing, finance, catalog }: { project: ProjectViewModel; sizing: SizingOutputV1 | null; finance: FinanceOutputV1 | null; catalog: readonly Equipment[] }) {
  const [preview, setPreview] = useState<DocKind>('rapport');
  const paperRef = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => { if (!first.current) paperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); first.current = false; }, [preview]);
  const print = (kind: DocKind) => { setPreview(kind); window.setTimeout(() => window.print(), 120); };
  return <>
    <div className="proj-list">{DOCS.map((doc) => <div className="proj-row" key={doc.key}><button style={{ textAlign: 'left' }} onClick={() => setPreview(doc.key)}><b>{doc.label}</b><small>{doc.note}</small></button><span className="when">A4 · 2 pages</span><button className="btn" aria-pressed={preview === doc.key} onClick={() => setPreview(doc.key)}>Aperçu</button><button className="btn btn-icon" aria-label={'Imprimer ' + doc.label} title={'Imprimer ' + doc.label} onClick={() => print(doc.key)}>⎙</button></div>)}</div>
    <div className="paper-wrap" ref={paperRef}><div className="rowline no-print"><h2 className="h-sec">Aperçu avant impression</h2><span className="sep" /><span className="label">Format A4 · 2 pages</span><button className="btn" onClick={() => window.print()}>Imprimer / PDF</button></div><ReportA4 project={project} kind={preview} sizing={sizing} finance={finance} catalog={catalog} /></div>
  </>;
}
