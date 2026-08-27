import type { ProjectFileTransferPort } from '../contracts.js';

export const browserFileTransfer: ProjectFileTransferPort = {
  pickTextFile: (request) => new Promise((resolve) => { const input = document.createElement('input'); input.type = 'file'; input.accept = request.accept; input.onchange = () => { const file = input.files?.[0]; if (!file) return resolve(null); void file.text().then((text) => resolve({ name: file.name, text })); }; input.click(); }),
  saveTextFile: async ({ filename, text, mimeType }) => { const blob = new Blob([text], { type: mimeType }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url); },
};
