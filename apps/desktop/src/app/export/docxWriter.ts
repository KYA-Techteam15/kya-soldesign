import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  PageNumber,
  PageOrientation,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import type { Block, DocSection, ReportDocument } from './reportModel';
import { mmToDocxPx, rasterizeSvg } from './rasterize';

/**
 * Écriture Word.
 *
 * Le document Word reprend la structure du rapport imprimé : mêmes sections,
 * mêmes tableaux, mêmes chiffres. La planche unifilaire est la seule pièce qui
 * change de nature — Word ne pose pas de SVG, elle y entre en PNG 300 dpi.
 *
 * L'orientation se décide par section : un saut de section suffit à coucher la
 * planche au milieu d'un document portrait.
 */

/**
 * Palette. Celle de `print.css`, reprise à l'identique : le Word et le PDF
 * sortent du même dossier, ils ne peuvent pas avoir deux identités.
 */
const INK = '1A1A1A';
const MUTED = '6B7684';
const TEAL = '1CA18C';
const TEAL_DARK = '158770';
const ORANGE = 'F99D32';
const BAND = 'FFF5E6';
const RULE = 'E1E6EA';
const ZEBRA = 'F7F9FA';
const WHITE = 'FFFFFF';
const FONT = 'Calibri';

/** Zone utile, marges d'impression déduites. */
const USABLE_MM = { portrait: 178, landscape: 267 } as const;
const MARGIN_MM = 16;

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
const HAIRLINE = { style: BorderStyle.SINGLE, size: 2, color: RULE } as const;

const text = (
  value: string,
  options: { bold?: boolean; size?: number; color?: string; caps?: boolean } = {},
): TextRun =>
  new TextRun({
    text: value,
    bold: options.bold ?? false,
    size: (options.size ?? 9) * 2,
    color: options.color ?? INK,
    font: FONT,
    allCaps: options.caps ?? false,
  });

const cell = (
  value: string,
  options: { bold?: boolean; right?: boolean; head?: boolean; fill?: string } = {},
): TableCell =>
  new TableCell({
    children: [
      new Paragraph({
        alignment: options.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 50, after: 50 },
        children: [
          text(value, {
            bold: options.bold ?? options.head ?? false,
            size: options.head ? 7.5 : 8.5,
            color: options.head ? WHITE : INK,
            caps: options.head ?? false,
          }),
        ],
      }),
    ],
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    shading: options.head ? { fill: TEAL_DARK } : options.fill ? { fill: options.fill } : undefined,
    borders: { top: NO_BORDER, bottom: options.head ? NO_BORDER : HAIRLINE, left: NO_BORDER, right: NO_BORDER },
  });

type Raster = { png: Uint8Array; widthPx: number; heightPx: number };
type CoverArt = { logo?: Raster; cover?: Raster };

/** Rend un bloc du modèle. Un bloc image demande un rendu asynchrone préalable. */
function renderBlock(
  block: Block,
  images: ReadonlyMap<Block, Raster>,
  art: ReadonlyMap<Block, CoverArt>,
): (Paragraph | Table)[] {
  switch (block.kind) {
    // Page de garde : mêmes éléments et mêmes couleurs que la couverture
    // imprimée, pour que le Word et le PDF soient la même pièce.
    case 'cover': {
      const visuals = art.get(block);
      const out: (Paragraph | Table)[] = [];
      if (visuals?.logo) {
        out.push(new Paragraph({
          spacing: { after: 120 },
          children: [new ImageRun({ type: 'png', data: visuals.logo.png, transformation: { width: visuals.logo.widthPx, height: visuals.logo.heightPx } })],
        }));
      }
      out.push(new Paragraph({
        spacing: { after: visuals?.cover ? 200 : 320 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 14, color: ORANGE, space: 4 } },
        children: [],
      }));
      if (visuals?.cover) {
        out.push(new Paragraph({
          spacing: { after: 320 },
          children: [new ImageRun({ type: 'png', data: visuals.cover.png, transformation: { width: visuals.cover.widthPx, height: visuals.cover.heightPx } })],
        }));
      }
      out.push(new Paragraph({ spacing: { after: 60 }, children: [text(block.docKind, { size: 8, color: TEAL_DARK, caps: true })] }));
      out.push(new Paragraph({ spacing: { after: 40 }, children: [text(block.project, { bold: true, size: 26 })] }));
      out.push(new Paragraph({ spacing: { after: 260 }, children: [text(block.subtitle, { size: 10, color: MUTED })] }));
      out.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
        rows: [new TableRow({
          children: [
            new TableCell({
              shading: { fill: BAND },
              margins: { top: 160, bottom: 160, left: 180, right: 100 },
              borders: { top: NO_BORDER, bottom: NO_BORDER, left: { style: BorderStyle.SINGLE, size: 20, color: ORANGE }, right: NO_BORDER },
              children: [
                new Paragraph({ children: [text('SYSTÈME RETENU', { size: 7, color: MUTED, caps: true })] }),
                new Paragraph({ spacing: { before: 50 }, children: [text(block.system, { bold: true, size: 12 })] }),
              ],
            }),
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              shading: { fill: BAND },
              margins: { top: 160, bottom: 160, left: 100, right: 180 },
              borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
              children: [
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [text(block.sri, { bold: true, size: 24, color: ORANGE })] }),
                new Paragraph({ alignment: AlignmentType.RIGHT, children: [text('SRI', { size: 7, color: MUTED, caps: true })] }),
              ],
            }),
          ],
        })],
      }));
      out.push(new Paragraph({ spacing: { after: 240 }, children: [] }));
      const pairs = block.cells;
      for (let index = 0; index < pairs.length; index += 2) {
        out.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER, insideHorizontal: NO_BORDER, insideVertical: NO_BORDER },
          rows: [new TableRow({
            children: pairs.slice(index, index + 2).map((entry) => new TableCell({
              borders: { top: NO_BORDER, bottom: HAIRLINE, left: NO_BORDER, right: NO_BORDER },
              margins: { top: 80, bottom: 80, left: 0, right: 160 },
              children: [
                new Paragraph({ children: [text(entry.label, { size: 7, color: MUTED, caps: true })] }),
                new Paragraph({ children: [text(entry.value, { bold: true, size: 11 })] }),
              ],
            })),
          })],
        }));
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }
      return out;
    }
    case 'title':
      return [
        new Paragraph({
          spacing: { before: 0, after: 60 },
          children: [text(block.text, { bold: true, size: 19, color: TEAL_DARK })],
        }),
        new Paragraph({
          spacing: { after: 180 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ORANGE, space: 8 } },
          children: [text(block.subtitle, { size: 9.5, color: MUTED })],
        }),
      ];

    // Un filet vertical teal marque la section, comme le fait la maquette
    // imprimée : le lecteur retrouve le même repère d'un support à l'autre.
    case 'heading':
      return [
        new Paragraph({
          spacing: { before: 260, after: 100 },
          border: {
            left: { style: BorderStyle.SINGLE, size: 18, color: TEAL, space: 8 },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 },
          },
          children: [text(block.text, { bold: true, size: 11, color: TEAL_DARK })],
        }),
      ];

    case 'meta':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: NO_BORDER,
            bottom: NO_BORDER,
            left: NO_BORDER,
            right: NO_BORDER,
            insideHorizontal: NO_BORDER,
            insideVertical: NO_BORDER,
          },
          rows: [
            new TableRow({
              children: block.items.map(
                (entry) =>
                  new TableCell({
                    borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                    margins: { top: 60, bottom: 60, left: 0, right: 120 },
                    children: [
                      new Paragraph({ children: [text(entry.label, { size: 7, color: TEAL, caps: true })] }),
                      new Paragraph({ children: [text(entry.value, { bold: true, size: 9.5 })] }),
                      new Paragraph({ children: [text(entry.note, { size: 7.5, color: MUTED })] }),
                    ],
                  }),
              ),
            }),
          ],
        }),
      ];

    // Le système retenu est le point culminant de la page : bande crème et
    // sceau orange, exactement comme sur la version imprimée.
    case 'headline':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: NO_BORDER,
            bottom: NO_BORDER,
            left: NO_BORDER,
            right: NO_BORDER,
            insideHorizontal: NO_BORDER,
            insideVertical: NO_BORDER,
          },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: BAND },
                  margins: { top: 140, bottom: 140, left: 160, right: 100 },
                  borders: {
                    top: NO_BORDER,
                    bottom: NO_BORDER,
                    left: { style: BorderStyle.SINGLE, size: 18, color: ORANGE },
                    right: NO_BORDER,
                  },
                  children: [
                    new Paragraph({ children: [text(block.label, { size: 7, color: MUTED, caps: true })] }),
                    new Paragraph({ spacing: { before: 40 }, children: [text(block.text, { bold: true, size: 11.5 })] }),
                  ],
                }),
                new TableCell({
                  width: { size: 20, type: WidthType.PERCENTAGE },
                  shading: { fill: BAND },
                  margins: { top: 140, bottom: 140, left: 100, right: 160 },
                  borders: { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                  children: [
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [text(block.sealValue, { bold: true, size: 20, color: ORANGE })],
                    }),
                    new Paragraph({
                      alignment: AlignmentType.RIGHT,
                      children: [text(block.sealLabel, { size: 7, color: MUTED, caps: true })],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new Paragraph({ spacing: { after: 100 }, children: [] }),
      ];

    case 'table': {
      const head = new TableRow({
        tableHeader: true,
        children: block.head.map((label, index) => cell(label, { head: true, right: block.numeric.includes(index) })),
      });
      // Alternance discrète pour suivre une ligne du regard ; bande crème sur
      // les totaux, qui sont ce que le lecteur cherche en premier.
      const body = block.rows.map((row, rowIndex) => {
        const emphasised = block.emphasis.includes(rowIndex);
        const fill = emphasised ? BAND : rowIndex % 2 === 1 ? ZEBRA : undefined;
        return new TableRow({
          children: row.map((value, index) =>
            cell(value, {
              right: block.numeric.includes(index),
              bold: emphasised,
              ...(fill ? { fill } : {}),
            }),
          ),
        });
      });
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: NO_BORDER,
            bottom: NO_BORDER,
            left: NO_BORDER,
            right: NO_BORDER,
            insideHorizontal: HAIRLINE,
            insideVertical: NO_BORDER,
          },
          rows: [head, ...body],
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      ];
    }

    case 'kpis':
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: NO_BORDER,
            bottom: NO_BORDER,
            left: NO_BORDER,
            right: NO_BORDER,
            insideHorizontal: NO_BORDER,
            insideVertical: NO_BORDER,
          },
          rows: [
            new TableRow({
              children: block.items.map(
                (entry) =>
                  new TableCell({
                    shading: { fill: ZEBRA },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 12, color: TEAL, space: 0 },
                      bottom: NO_BORDER,
                      left: NO_BORDER,
                      right: { style: BorderStyle.SINGLE, size: 8, color: WHITE },
                    },
                    margins: { top: 110, bottom: 110, left: 110, right: 110 },
                    children: [
                      new Paragraph({ children: [text(entry.label, { size: 7, color: MUTED, caps: true })] }),
                      new Paragraph({
                        spacing: { before: 40 },
                        children: [
                          text(entry.value, { bold: true, size: 14, color: TEAL_DARK }),
                          text(` ${entry.unit}`, { size: 7.5, color: MUTED }),
                        ],
                      }),
                    ],
                  }),
              ),
            }),
          ],
        }),
        new Paragraph({ spacing: { after: 120 }, children: [] }),
      ];

    case 'paragraph':
      return [
        new Paragraph({
          spacing: { after: 60 },
          children: [text(`${block.label} `, { bold: true, size: 8.5, color: TEAL_DARK }), text(block.text, { size: 8.5 })],
        }),
      ];

    case 'image': {
      const raster = images.get(block);
      if (!raster) {
        return [new Paragraph({ children: [text('Schéma indisponible.', { size: 9, color: MUTED })] })];
      }
      return [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 60 },
          children: [
            new ImageRun({
              type: 'png',
              data: raster.png,
              transformation: { width: raster.widthPx, height: raster.heightPx },
            }),
          ],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [text(block.caption, { size: 7.5, color: MUTED })],
        }),
      ];
    }

    case 'signature':
      return [
        new Paragraph({ spacing: { before: 320 }, children: [] }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: NO_BORDER,
            bottom: NO_BORDER,
            left: NO_BORDER,
            right: NO_BORDER,
            insideHorizontal: NO_BORDER,
            insideVertical: NO_BORDER,
          },
          rows: [
            new TableRow({
              children: [block.left, block.right].map(
                (value) =>
                  new TableCell({
                    borders: { top: HAIRLINE, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                    margins: { top: 100, bottom: 100, left: 0, right: 120 },
                    children: [new Paragraph({ children: [text(value, { size: 8.5, color: MUTED })] })],
                  }),
              ),
            }),
          ],
        }),
      ];
  }
}

/** Charge les visuels de la page de garde ; un échec n'empêche pas l'export. */
async function loadCoverArt(document: ReportDocument): Promise<Map<Block, CoverArt>> {
  const art = new Map<Block, CoverArt>();
  for (const section of document.sections) {
    for (const block of section.blocks) {
      if (block.kind !== 'cover') continue;
      const entry: CoverArt = {};
      entry.logo = await loadImage(block.logoUrl, mmToDocxPx(46));
      entry.cover = await loadImage(block.coverUrl, mmToDocxPx(USABLE_MM.portrait));
      art.set(block, entry);
    }
  }
  return art;
}

/** Lit une URL d'objet et la ramène à la largeur voulue, ratio conservé. */
async function loadImage(url: string | null, widthPx: number): Promise<Raster | undefined> {
  if (!url) return undefined;
  try {
    const png = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const ratio = await new Promise<number>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image.naturalHeight / image.naturalWidth);
      image.onerror = () => reject(new Error('asset'));
      image.src = url;
    });
    return { png, widthPx, heightPx: Math.round(widthPx * ratio) };
  } catch {
    return undefined;
  }
}

/** Rastérise toutes les planches du document, à la largeur de leur page. */
async function rasterizeImages(document: ReportDocument): Promise<Map<Block, Raster>> {
  const images = new Map<Block, Raster>();
  for (const section of document.sections) {
    const usableMm = USABLE_MM[section.orientation];
    for (const block of section.blocks) {
      if (block.kind !== 'image') continue;
      const raster = await rasterizeSvg(block.svg, block.widthPx, block.heightPx, usableMm);
      images.set(block, {
        png: raster.png,
        widthPx: mmToDocxPx(usableMm),
        heightPx: Math.round(mmToDocxPx(usableMm) * (block.heightPx / block.widthPx)),
      });
    }
  }
  return images;
}

function sectionOf(
  section: DocSection,
  document: ReportDocument,
  images: ReadonlyMap<Block, Raster>,
  art: ReadonlyMap<Block, CoverArt>,
) {
  return {
    properties: {
      page: {
        size:
          section.orientation === 'landscape'
            ? { orientation: PageOrientation.LANDSCAPE }
            : { orientation: PageOrientation.PORTRAIT },
        margin: {
          top: convertMillimetersToTwip(MARGIN_MM),
          bottom: convertMillimetersToTwip(MARGIN_MM - 2),
          left: convertMillimetersToTwip(MARGIN_MM),
          right: convertMillimetersToTwip(MARGIN_MM),
        },
      },
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: TEAL, space: 6 } },
            spacing: { after: 160 },
            children: [
              text(document.company.name, { bold: true, size: 10, color: TEAL_DARK }),
              text(document.company.contact ? `    ${document.company.contact}` : '', { size: 7.5, color: MUTED }),
            ],
          }),
        ],
      }),
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 6, color: ORANGE, space: 6 } },
            children: [
              text(document.footer, { size: 7, color: MUTED }),
              new TextRun({
                children: ['\t', PageNumber.CURRENT, ' / ', PageNumber.TOTAL_PAGES],
                size: 14,
                color: MUTED,
                font: FONT,
              }),
            ],
          }),
        ],
      }),
    },
    children: section.blocks.flatMap((block) => renderBlock(block, images, art)),
  };
}

/** Produit le fichier Word du document. */
export async function writeDocx(document: ReportDocument): Promise<Blob> {
  const images = await rasterizeImages(document);
  const art = await loadCoverArt(document);
  const file = new Document({
    creator: document.company.name,
    title: document.title,
    description: document.footer,
    sections: document.sections.map((section) => sectionOf(section, document, images, art)),
  });
  return Packer.toBlob(file);
}

/** Écrit puis propose le fichier au téléchargement. */
export async function downloadDocx(document: ReportDocument): Promise<void> {
  const blob = await writeDocx(document);
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = document.fileName;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
