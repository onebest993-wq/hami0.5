import { describe, expect, it } from 'vitest';
import {
  buildCategoryObjectPath,
  isForumEncryptedUpload,
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
    expect(isStoragePathOwnedByUser('user-a/%2e%2e/user-b/secret.pdf', 'user-a')).toBe(false);
    expect(isStoragePathOwnedByUser('user-a/%252e%252e/user-b/secret.pdf', 'user-a')).toBe(false);
  });

  it('isForumEncryptedUpload يقبل .enc في forum-media فقط', () => {
    expect(isForumEncryptedUpload('forum-media', '12_photo.jpg.enc')).toBe(true);
    expect(isForumEncryptedUpload('vault', '12_photo.jpg.enc')).toBe(false);
    expect(isForumEncryptedUpload('forum-media', 'photo.jpg')).toBe(false);
    expect(isForumEncryptedUpload('forum-media', 'icon.svg.enc')).toBe(false);
  });
});
