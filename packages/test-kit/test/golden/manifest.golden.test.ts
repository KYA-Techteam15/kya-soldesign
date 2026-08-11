import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { goldenManifestSchema } from '../../src/golden-manifest.js';

describe('golden manifest', () => {
  it('is structurally valid and never hides unreviewed expectations', async () => {
    const text = await readFile(new URL('../../../../test-data/golden/manifest.json', import.meta.url), 'utf8');
    const manifest = goldenManifestSchema.parse(JSON.parse(text));
    expect(manifest.schemaVersion).toBe(1);
  });
});

