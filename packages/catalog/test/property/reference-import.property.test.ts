import { createHash } from 'node:crypto';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { canonicalIdentity, parseLegacyScalar } from '../../src/index.js';

describe('reference import properties', () => {
  it('does not coerce explicit unknown scalar values to zero', () => {
    fc.assert(fc.property(fc.constantFrom('', 'N/A', 'unknown', 'inconnu', null, undefined), (value) => {
      expect(parseLegacyScalar(value).value).toBeNull();
    }));
  });

  it('keeps canonical identity stable through insignificant whitespace and accents', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-z]{1,12}$/), (word) => {
      const accented = word.replaceAll('e', 'é');
      expect(canonicalIdentity(['catalog', `  ${accented}\t`, 'model']))
        .toBe(canonicalIdentity(['catalog', word, 'model']));
    }));
  });

  it('produces deterministic digests for repeated canonical identities', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-z]{1,16}$/), (word) => {
      const identity = canonicalIdentity(['catalog', word]);
      const first = createHash('sha256').update(identity).digest('hex');
      const second = createHash('sha256').update(identity).digest('hex');
      expect(first).toBe(second);
    }));
  });
});
