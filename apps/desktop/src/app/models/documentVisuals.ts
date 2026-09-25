import { reportAssetRepository } from '../adapters/reportAssetRepository.js';

/**
 * Visuels propres à un dossier (spec 012, FR-A4).
 *
 * Ils voyagent avec le projet, export `.ksd` compris : ils sont donc stockés dans le projet sous
 * forme d'image embarquée, réduite pour ne pas alourdir le fichier. Le logo garde sa transparence
 * (PNG) ; la couverture, une photographie le plus souvent, passe en JPEG.
 */
const LIMITS = { logo: { side: 640, type: 'image/png' }, cover: { side: 1600, type: 'image/jpeg' } } as const;

export async function imageFileToEmbedded(file: File, kind: 'logo' | 'cover'): Promise<string> {
  await reportAssetRepository.validate(file);
  // Un SVG reste vectoriel : il est déjà léger et net à toute taille.
  if (file.type === 'image/svg+xml') return readAsDataUrl(file);
  const bitmap = await createImageBitmap(file);
  const limit = LIMITS[kind];
  const scale = Math.min(1, limit.side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('REPORT_ASSET_WRITE_FAILED');
  if (limit.type === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL(limit.type, 0.86);
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('REPORT_ASSET_WRITE_FAILED'));
    reader.readAsDataURL(file);
  });
}
