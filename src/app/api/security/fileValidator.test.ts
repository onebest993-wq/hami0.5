import { describe, it, expect } from 'vitest';
import { verifyFileContentHash } from './fileValidator';

describe('fileValidator.verifyFileContentHash', () => {
  it('returns true for an exact SHA-256 match', () => {
    const buffer = Buffer.from('hami-security-test', 'utf8');
    const expected = '0a3384d9f8655dd16d6b071d270c5ebe3c5abebdfedfcf715c2a5df64e198d03';
    expect(verifyFileContentHash(buffer, expected)).toBe(true);
  });

  it('returns false for invalid hash formats', () => {
    const buffer = Buffer.from('hami-security-test', 'utf8');
    expect(verifyFileContentHash(buffer, '')).toBe(false);
    expect(verifyFileContentHash(buffer, 'abc')).toBe(false);
    expect(verifyFileContentHash(buffer, 'z'.repeat(64))).toBe(false);
  });

  it('returns false for mismatched hash', () => {
    const buffer = Buffer.from('hami-security-test', 'utf8');
    const wrong = '1'.repeat(64);
    expect(verifyFileContentHash(buffer, wrong)).toBe(false);
  });
});

