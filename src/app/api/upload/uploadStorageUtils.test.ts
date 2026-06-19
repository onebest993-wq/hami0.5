import { describe, expect, it } from 'vitest';
import {
  buildCategoryObjectPath,
  isStoragePathOwnedByUser,
} from './uploadStorageUtils.ts';

describe('uploadStorageUtils', () => {
  it('buildCategoryObjectPath scopes under userId/category', () => {
    const path = buildCategoryObjectPath('user-a', 'vault', 'scan.pdf');
    expect(path.startsWith('user-a/vault/')).toBe(true);
    expect(path.endsWith('_scan.pdf')).toBe(true);
  });

  it('isStoragePathOwnedByUser rejects traversal and foreign paths', () => {
    expect(isStoragePathOwnedByUser('user-a/vault/x.pdf', 'user-a')).toBe(true);
    expect(isStoragePathOwnedByUser('user-b/vault/x.pdf', 'user-a')).toBe(false);
    expect(isStoragePathOwnedByUser('../user-a/vault/x.pdf', 'user-a')).toBe(false);
    expect(isStoragePathOwnedByUser('user-a/../user-b/x.pdf', 'user-a')).toBe(false);
  });
});
