import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { FinanceOutputV1, PresizingOutputV1, SizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { Equipment } from '@ksd/catalog';
import type { ProjectViewModel } from '../../app/models/projectView';

import { useSettings } from '../../store/settings';
import { useUi } from '../../store/ui';
import { translate } from '../../i18n';
import { useReportAssetUrl } from '../../app/adapters/reportAssetRepository';
import { buildProjectDiagram, synopticOptions } from '../../app/diagram/projectDiagram';
import { buildReportDocument, type Block, type DocSection } from '../../app/export/reportModel';
import { defaultReportOptions, type DocKind, type ReportOptions } from '../../app/export/documentComposition';
import type { PagePiece } from '../../app/export/pagination';
import { measureSheets } from '../../app/export/measureSheets';

export type { DocKind };

/**
 * Aperçu avant impression.
 *
 * Il ne décrit plus le document une seconde fois : il rend exactement le modèle
 * de blocs que `docxWriter` transforme en Word. Deux descriptions parallèles du
 * même rapport avaient fini par diverger — l'écran annonçait des puissances que
 * le moteur n'avait jamais calculées.
 */
export function ReportA4({ project, kind, sizing, finance, solar, presizing, catalog, options, version = null, visuals }: {
  project: ProjectViewModel;
  /** Visuels effectifs (dossier ou société), résolus par l'appelant ; à défaut, ceux des réglages. */
  visuals?: { readonly logoUrl: string; readonly coverUrl: string | null };
  version?: { readonly number: number; readonly issuedAtIso: string } | null;
  kind: DocKind;
  sizing: SizingOutputV1 | null;
  finance: FinanceOutputV1 | null;
  solar: SolarResourceAnalysisOutputV1 | null;
  presizing?: PresizingOutputV1 | null;
  catalog: readonly Equipment[];
  options?: ReportOptions;
}) {
  const settings = useSettings();
  const uiLang = useUi((state) => state.lang);
  const logoUrl = useReportAssetUrl(settings.reports.logoAssetId);
  const coverUrl = useReportAssetUrl(settings.reports.coverAssetId);
  const signatureUrl = useReportAssetUrl(settings.reports.signatureAssetId);
  const resolved = useMemo(() => options ?? defaultReportOptions(kind, uiLang), [options, kind, uiLang]);
  const t = useMemo(() => (key: string) => translate(key, resolved.lang), [resolved.lang]);

  /**
   * Visuel de marque effectif.
   *
   * Sans fichier importé, l'aperçu retombait sur le logo livré avec
   * l'application tandis que le Word, lui, ne recevait rien : le même dossier
   * sortait signé à l'écran et anonyme dans le document.
   */
  const effectiveLogoUrl = visuals?.logoUrl ?? (project.details.documentLogo || logoUrl || settings.reports.logoUrl || '/kya-sol-design-logo.png');
  const effectiveCoverUrl = visuals ? visuals.coverUrl : (project.details.projectImage || coverUrl);

  // Toutes les pièces reçoivent la planche complète : le synoptique condensé
  // tenait dans une colonne, mais n'y était plus lisible.
  const diagram = useMemo(() => {
    if (!sizing) return null;
    // Rapport, offre, proforma : le synoptique, conçu pour une page A4 ; le dossier d'exécution : la planche complète.
    const built = buildProjectDiagram({ project, sizing, catalog, settings, lang: resolved.lang, ...(kind === 'dossier_exec' ? {} : { options: synopticOptions }) });
    return { svg: built.svg, width: built.plan.width, height: built.plan.height, bom: built.plan.bom };
  }, [project, sizing, catalog, settings, resolved.lang, kind]);

  // La version arrive souvent en objet neuf à chaque rendu : on la fige sur son contenu.
  const versionNumber = version?.number ?? null;
  const versionIssuedAt = version?.issuedAtIso ?? null;
  const stableVersion = useMemo(() => (versionNumber === null || versionIssuedAt === null ? null : { number: versionNumber, issuedAtIso: versionIssuedAt }), [versionNumber, versionIssuedAt]);

  const document = useMemo(() => buildReportDocument({
    project, kind, sizing, finance, solar, presizing, catalog, settings, t, diagram,
    assets: { logoUrl: effectiveLogoUrl, coverUrl: effectiveCoverUrl, signatureUrl },
    options: resolved,
    version: stableVersion,
  }), [project, kind, sizing, finance, solar, presizing, catalog, settings, t, diagram, effectiveLogoUrl, effectiveCoverUrl, signatureUrl, resolved, stableVersion]);

  const brandContact = [settings.company.address, settings.company.phone, settings.company.email].filter(Boolean).join(' · ');
  const [layout, setLayout] = usePagination(document.sections);

  /* Feuilles effectives : la couverture seule, chaque autre partie sur autant de feuilles que la
     mesure l'exige. Avant la première mesure, une partie tient sur une feuille qui s'allonge. */
  const sheets = document.sections.flatMap((section, sectionIndex) => {
    if (isCoverSection(section)) return [{ section, pieces: section.blocks.map((_, block) => ({ block })) as PagePiece[] }];
    const pages = layout?.get(sectionIndex) ?? [section.blocks.map((_, block) => ({ block }))];
    return pages.map((pieces) => ({ section, pieces }));
  });
  // Numéro de feuille de chaque titre, pour le sommaire.
  const headingPages = new Map<string, number>();
  sheets.forEach((sheet, index) => sheet.pieces.forEach((piece) => {
    const block = sheet.section.blocks[piece.block];
    if (block?.kind === 'heading' && !headingPages.has(block.text)) headingPages.set(block.text, index + 1);
  }));
  // Stable d'un rendu à l'autre : la mesure ne se refait que si l'habillage change vraiment.
  const chrome = useMemo<SheetChrome>(() => ({
    documentFooter: `${document.footer} · ${document.reference}`,
    companyName: settings.company.name,
    contact: brandContact,
    editedOn: document.issuedOn,
    logo: effectiveLogoUrl,
    watermark: document.watermark,
    pageLabel: document.pageLabel,
  }), [document, settings.company.name, brandContact, effectiveLogoUrl]);

  return <>
    <div className="a4-stack">
      {sheets.map((sheet, index) => <Sheet
        key={index}
        section={sheet.section}
        pieces={sheet.pieces}
        chrome={chrome}
        page={index + 1}
        total={sheets.length}
        paginated={layout !== null}
        headingPages={headingPages}
      />)}
    </div>
    <MeasureStage sections={document.sections} chrome={chrome} onLayout={setLayout} />
  </>;
}

interface SheetChrome {
  readonly documentFooter: string;
  readonly companyName: string;
  readonly contact: string;
  readonly editedOn: string;
  readonly logo: string;
  readonly watermark: string;
  readonly pageLabel: string;
}

const isCoverSection = (section: DocSection) => section.blocks[0]?.kind === 'cover';

function sheetClass(section: DocSection, paginated: boolean): string {
  return ['a4', section.orientation === 'landscape' ? 'a4-landscape' : '', isCoverSection(section) ? 'a4-cover' : '', paginated ? 'a4-sheet' : ''].filter(Boolean).join(' ');
}

function SheetHeader({ chrome }: { readonly chrome: SheetChrome }) {
  return <>
    <div className="a4-brand">
      <img className="a4-logo-image" src={chrome.logo} alt={chrome.companyName || 'KYA-SolDesign'} />
      <div className="a4-who"><b>{chrome.companyName}</b><br />{chrome.contact || '—'}<br />{chrome.editedOn}</div>
    </div>
    <div className="a4-rule" />
  </>;
}

function Sheet({ section, pieces, chrome, page, total, paginated, headingPages }: {
  readonly section: DocSection;
  readonly pieces: readonly PagePiece[];
  readonly chrome: SheetChrome;
  readonly page: number;
  readonly total: number;
  readonly paginated: boolean;
  readonly headingPages: ReadonlyMap<string, number>;
}) {
  const cover = isCoverSection(section);
  return <article className={sheetClass(section, paginated && !cover)}>
    {chrome.watermark.length > 0 && <div className="a4-watermark" aria-hidden="true">{chrome.watermark.toUpperCase()}</div>}
    {cover
      ? section.blocks.map((block, index) => <BlockView key={index} block={block} companyName={chrome.companyName} contact={chrome.contact} />)
      : <>
        <SheetHeader chrome={chrome} />
        <div className="a4-flow">
          {pieces.map((piece) => {
            const block = section.blocks[piece.block]!;
            return <div className="a4-block" data-kind={block.kind} key={`${piece.block}-${piece.rows?.[0] ?? 0}`}>
              <BlockView block={block} rows={piece.rows} companyName={chrome.companyName} contact={chrome.contact} headingPages={headingPages} />
            </div>;
          })}
        </div>
      </>}
    <div className="a4-foot"><span>{chrome.documentFooter}</span><span>{chrome.pageLabel} {page} / {total}</span></div>
  </article>;
}

type Layout = ReadonlyMap<number, PagePiece[][]>;

/** Répartition en vigueur pour ces parties ; `null` tant qu'elles n'ont pas été mesurées. */
function usePagination(sections: readonly DocSection[]): readonly [Layout | null, (pages: Layout) => void] {
  const [layout, setLayout] = useState<{ readonly sections: readonly DocSection[]; readonly pages: Layout } | null>(null);
  const update = useCallback((pages: Layout) => setLayout((current) => (
    current !== null && current.sections === sections && JSON.stringify([...current.pages]) === JSON.stringify([...pages]) ? current : { sections, pages }
  )), [sections]);
  return [layout !== null && layout.sections === sections ? layout.pages : null, update];
}

/**
 * Mesure hors écran : chaque partie est rendue une fois d'un seul tenant, à côté d'une feuille vide
 * de même orientation qui donne la hauteur utile. La répartition suit la mesure, et se refait quand
 * une image ou une police change une hauteur.
 */
function MeasureStage({ sections, chrome, onLayout }: { readonly sections: readonly DocSection[]; readonly chrome: SheetChrome; readonly onLayout: (pages: Layout) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (stage === null) return undefined;
    const measure = () => onLayout(measureSheets(stage));
    measure();
    let alive = true;
    const observer = new ResizeObserver(measure);
    stage.querySelectorAll('.a4-measure').forEach((element) => observer.observe(element));
    void document.fonts.ready.then(() => { if (alive) measure(); });
    return () => { alive = false; observer.disconnect(); };
  }, [sections, chrome, onLayout]);

  return <div className="a4-measure-stage" ref={stageRef} aria-hidden="true">
    {sections.map((section, index) => isCoverSection(section) ? null : <div key={index} data-section={index}>
      <article className={`${sheetClass(section, true)} a4-probe`}><SheetHeader chrome={chrome} /><div className="a4-flow" /><div className="a4-foot"><span>{chrome.documentFooter}</span><span>{chrome.pageLabel}</span></div></article>
      <article className={`${sheetClass(section, false)} a4-measure`}>
        <SheetHeader chrome={chrome} />
        <div className="a4-flow">{section.blocks.map((block, blockIndex) => <div className="a4-block" data-kind={block.kind} key={blockIndex}>
          {/* La planche ne se rend pas deux fois : une boîte de même proportion et mêmes plafonds suffit à la mesure. */}
          {block.kind === 'image'
            ? <div className="a4-diagram"><div className="a4-diagram-box" style={{ aspectRatio: `${block.widthPx} / ${block.heightPx}` }} /></div>
            : <BlockView block={block} companyName={chrome.companyName} contact={chrome.contact} />}
        </div>)}</div>
      </article>
    </div>)}
  </div>;
}

function BlockView({ block, rows, companyName, contact, headingPages }: {
  block: Block;
  /** Tableau coupé : lignes portées par cette feuille. */
  rows?: readonly [number, number] | undefined;
  companyName: string;
  contact: string;
  headingPages?: ReadonlyMap<string, number>;
}) {
  switch (block.kind) {
    // Page de garde : l'œil descend du logo au titre, du titre à l'image, et
    // ne rencontre les mentions administratives qu'ensuite. Tout est centré —
    // une couverture n'est pas une page de texte.
    case 'cover':
      return <>
        <div className="cover-mark">
          <img src={block.logoUrl || '/kya-sol-design-logo.png'} alt={companyName || 'KYA-SolDesign'} />
        </div>
        <div className="cover-rule"><i /><i /></div>
        <div className="cover-kind">{block.docKind}</div>
        <h1 className="cover-title">{block.project}</h1>
        <div className="cover-sub">{block.subtitle}</div>
        {block.coverUrl && <figure className="cover-figure"><img src={block.coverUrl} alt="" /></figure>}
        <div className="a4-spacer" />
        <div className="cover-band">
          <div><span className="cover-lbl">{block.systemLabel}</span><b>{block.system}</b></div>
          <div className="cover-seal"><b>{block.sri}</b><span className="cover-lbl">SRI</span></div>
        </div>
        <dl className="cover-grid">{block.cells.map((cell) => <div key={cell.label}><dt>{cell.label}</dt><dd>{cell.value}</dd></div>)}</dl>
        <div className="cover-foot"><span>{block.ownership}</span><span>{contact}</span></div>
      </>;

    case 'title':
      return <><h1 className="a4-title">{block.text}</h1><div className="a4-sub">{block.subtitle}</div></>;

    case 'heading':
      return <h3 className="a4-sec">{block.text}</h3>;

    case 'meta':
      return <dl className="a4-meta">{block.items.map((entry) => <div key={entry.label}>
        <dt>{entry.label}</dt><dd>{entry.value}{entry.note && <small>{entry.note}</small>}</dd>
      </div>)}</dl>;

    case 'headline':
      return <div className="a4-headline">
        <div><h2>{block.label}</h2><p>{block.text}</p></div>
        <div className="a4-seal"><b>{block.sealValue}</b><span>{block.sealLabel}</span></div>
      </div>;

    case 'table': {
      // Un tableau coupé garde ses numéros de ligne d'origine : les totaux restent accentués.
      const [start, end] = rows ?? [0, block.rows.length];
      return <table className="a4-tbl">
        <thead><tr>{block.head.map((cell, cellIndex) => <th key={cell} className={block.numeric.includes(cellIndex) ? 'num' : undefined}>{cell}</th>)}</tr></thead>
        <tbody>{block.rows.slice(start, end).map((row, offset) => <tr key={start + offset} className={rowClass(block.emphasis, start + offset, block.rows.length)}>
          {row.map((cell, cellIndex) => <td key={cellIndex} className={block.numeric.includes(cellIndex) ? 'num' : ''}>{cell}</td>)}
        </tr>)}</tbody>
      </table>;
    }

    case 'toc':
      return <nav className="a4-toc" aria-label={block.title}>
        <h3 className="a4-sec">{block.title}</h3>
        <ol>{block.entries.map((entry) => <li key={entry}><span>{entry}</span><i aria-hidden="true" /><b>{headingPages?.get(entry) ?? ''}</b></li>)}</ol>
      </nav>;

    case 'kpis':
      return <dl className="a4-kpis">{block.items.map((entry) => <div key={entry.label}>
        <dt>{entry.label}</dt>
        <dd className={entry.unit === '' && !/^[\d\s.,+-]*$/u.test(entry.value) ? 'a4-kpi-text' : ''}>
          {entry.value}{entry.unit && <span className="u">{entry.unit}</span>}
        </dd>
      </div>)}</dl>;

    case 'paragraph':
      return block.label.trim().length > 0
        ? <div className="a4-cond"><p><b>{block.label}</b> {block.text}</p></div>
        : <p className="a4-note">{block.text}</p>;

    case 'checklist':
      return <ul className="a4-checklist">{block.items.map((label) => <li key={label}>{label}</li>)}</ul>;

    case 'image':
      return <div className="a4-diagram" dangerouslySetInnerHTML={{ __html: block.svg }} />;

    case 'signature':
      return <div className="a4-sign">
        <div>{block.imageUrl && <img className="a4-sign-mark" src={block.imageUrl} alt="" />}{block.left}</div>
        <div>{block.right}</div>
      </div>;
  }
}

/**
 * Les lignes de total se lisent d'un coup d'œil. `emphasis` porte l'index de
 * la première ligne accentuée ; ce qui suit est un sous-total, et la dernière
 * ligne d'une table qui en a plusieurs porte le montant final.
 */
function rowClass(emphasis: readonly number[], index: number, count: number): string {
  if (!emphasis.includes(index) && index < Math.min(...emphasis, count)) return '';
  if (emphasis.includes(index)) return 'total';
  if (index === count - 1 && emphasis.length > 0) return 'grand';
  return index > Math.min(...emphasis, count) ? 'sub' : '';
}
