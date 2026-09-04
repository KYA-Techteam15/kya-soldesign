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

const INK = '14181D';
const MUTED = '66717F';
const ACCENT = '0B6A5F';
const RULE = 'D3D9DC';
const HEAD_FILL = 'F1F4F3';
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

const cell = (value: string, options: { bold?: boolean; right?: boolean; head?: boolean } = {}): TableCell =>
  new TableCell({
    children: [
      new Paragraph({
        alignment: options.right ? AlignmentType.RIGHT : AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
        children: [
          text(value, {
            bold: options.bold ?? options.head ?? false,
            size: options.head ? 7.5 : 8.5,
            color: options.head ? MUTED : INK,
            caps: options.head ?? false,
          }),
        ],
      }),
    ],
    margins: { top: 40, bottom: 40, left: 80, right: 80 },
    shading: options.head ? { fill: HEAD_FILL } : undefined,
    borders: { top: NO_BORDER, bottom: HAIRLINE, left: NO_BORDER, right: NO_BORDER },
  });

/** Rend un bloc du modèle. Un bloc image demande un rendu asynchrone préalable. */
function renderBlock(block: Block, images: ReadonlyMap<Block, { png: Uint8Array; widthPx: number; heightPx: number }>): (Paragraph | Table)[] {
  switch (block.kind) {
    case 'title':
      return [
        new Paragraph({
          spacing: { before: 0, after: 40 },
          children: [text(block.text, { bold: true, size: 18 })],
        }),
        new Paragraph({
          spacing: { after: 200 },
          children: [text(block.subtitle, { size: 9.5, color: MUTED })],
        }),
      ];

    case 'heading':
      return [
        new Paragraph({
          spacing: { before: 240, after: 90 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
          children: [text(block.text, { bold: true, size: 11 })],
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
                      new Paragraph({ children: [text(entry.label, { size: 7, color: MUTED, caps: true })] }),
                      new Paragraph({ children: [text(entry.value, { bold: true, size: 9.5 })] }),
                      new Paragraph({ children: [text(entry.note, { size: 7.5, color: MUTED })] }),
                    ],
                  }),
              ),
            }),
          ],
        }),
      ];

    case 'headline':
      return [
        new Paragraph({
          spacing: { before: 200, after: 20 },
          children: [text(block.label, { size: 7.5, color: MUTED, caps: true })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [
            text(block.text, { bold: true, size: 11 }),
            text(`     ${block.sealLabel} ${block.sealValue}`, { bold: true, size: 11, color: ACCENT }),
          ],
        }),
      ];

    case 'table': {
      const head = new TableRow({
        tableHeader: true,
        children: block.head.map((label, index) => cell(label, { head: true, right: block.numeric.includes(index) })),
      });
      const body = block.rows.map(
        (row, rowIndex) =>
          new TableRow({
            children: row.map((value, index) =>
              cell(value, { right: block.numeric.includes(index), bold: block.emphasis.includes(rowIndex) }),
            ),
          }),
      );
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
                    borders: { top: HAIRLINE, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                    margins: { top: 80, bottom: 80, left: 0, right: 120 },
                    children: [
                      new Paragraph({ children: [text(entry.label, { size: 7, color: MUTED, caps: true })] }),
                      new Paragraph({
                        children: [
                          text(entry.value, { bold: true, size: 13 }),
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
          children: [text(`${block.label} `, { bold: true, size: 8.5 }), text(block.text, { size: 8.5 })],
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

/** Rastérise toutes les planches du document, à la largeur de leur page. */
async function rasterizeImages(
  document: ReportDocument,
): Promise<Map<Block, { png: Uint8Array; widthPx: number; heightPx: number }>> {
  const images = new Map<Block, { png: Uint8Array; widthPx: number; heightPx: number }>();
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
  images: ReadonlyMap<Block, { png: Uint8Array; widthPx: number; heightPx: number }>,
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
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 6 } },
            spacing: { after: 160 },
            children: [
              text(document.company.name, { bold: true, size: 10 }),
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
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: RULE, space: 6 } },
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
    children: section.blocks.flatMap((block) => renderBlock(block, images)),
  };
}

/** Produit le fichier Word du document. */
export async function writeDocx(document: ReportDocument): Promise<Blob> {
  const images = await rasterizeImages(document);
  const file = new Document({
    creator: document.company.name,
    title: document.title,
    description: document.footer,
    sections: document.sections.map((section) => sectionOf(section, document, images)),
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
