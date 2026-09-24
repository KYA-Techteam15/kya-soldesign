import type { ProjectFileTransferPort } from '../contracts.js';
import { saveFile } from './files.js';

/**
 * Échange de fichiers texte (projets, réglages). La lecture passe par le
 * sélecteur de fichiers standard, disponible aussi dans WebView2 ; l'écriture
 * par `saveFile`, qui ouvre une boîte native sous Tauri.
 */
export const fileTransfer: ProjectFileTransferPort = {
  pickTextFile: (request) => new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = request.accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      void file.text().then((text) => resolve({ name: file.name, text }));
    };
    input.oncancel = () => resolve(null);
    input.click();
  }),
  saveTextFile: async ({ filename, text, mimeType }) => {
    await saveFile({ suggestedName: filename, data: text, mimeType, filter: { name: 'KYA-SolDesign', extensions: [filename.split('.').at(-1) ?? 'json'] } });
  },
};
