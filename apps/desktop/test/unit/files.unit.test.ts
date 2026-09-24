import { describe, expect, it } from 'vitest';
import { safeFileName } from '../../src/app/platform/files.js';

describe('safeFileName', () => {
  it('transliterates accents instead of dropping letters', () => {
    expect(safeFileName('Nom modifié')).toBe('Nom-modifie');
    expect(safeFileName('Centre de santé Bombouaka — Lomé')).toBe('Centre-de-sante-Bombouaka-Lome');
    expect(safeFileName('Œuvre')).toBe('OEuvre');
  });
  it('removes characters forbidden on Windows and keeps a fallback', () => {
    expect(safeFileName(String.raw`a<b>c:d"e/f\g|h?i*j`)).toBe('a-b-c-d-e-f-g-h-i-j');
    expect(safeFileName('   ', 'projet')).toBe('projet');
  });
});
