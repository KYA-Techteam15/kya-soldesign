/**
 * Rastérisation de la planche pour Word.
 *
 * Word ne sait pas poser de SVG : le document reçoit donc un PNG dérivé du
 * même SVG que l'impression, calculé à la résolution d'impression visée et non
 * à celle de l'écran. Le SVG reste la source ; ce PNG n'existe que pour Word.
 */

export const PRINT_DPI = 300;

/** Convertit des millimètres en pixels à la résolution d'impression. */
export const mmToPrintPx = (mm: number): number => Math.round((mm / 25.4) * PRINT_DPI);

/** Convertit des millimètres en pixels d'écran, unité attendue par `docx`. */
export const mmToDocxPx = (mm: number): number => Math.round((mm / 25.4) * 96);

export interface RasterResult {
  readonly png: Uint8Array;
  readonly widthPx: number;
  readonly heightPx: number;
}

/**
 * Rend un SVG en PNG à la largeur d'impression demandée.
 * Rejette plutôt que de rendre une image vide : un plan absent doit se voir.
 */
export async function rasterizeSvg(svg: string, planWidth: number, planHeight: number, targetWidthMm: number): Promise<RasterResult> {
  const targetPx = mmToPrintPx(targetWidthMm);
  const scale = targetPx / planWidth;
  const width = Math.round(planWidth * scale);
  const height = Math.round(planHeight * scale);

  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error("Le rendu du schéma a échoué : contexte 2D indisponible.");
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const png = await canvasToPng(canvas);
    return { png, widthPx: width, heightPx: height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Le schéma n’a pas pu être converti en image.'));
    image.src = url;
  });
}

async function canvasToPng(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error("Le schéma n’a pas pu être encodé en PNG.");
  return new Uint8Array(await blob.arrayBuffer());
}
