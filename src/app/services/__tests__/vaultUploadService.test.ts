import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import {
    isVaultDocImage,
    isVaultDocPdf,
    isVaultDocLocal,
    isVaultPdfFile,
    resolveVaultDocUrl,
} from '@/app/services/vaultUploadService';

vi.mock('@/app/services/lawyer-cloud', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/lawyer-cloud')>();
    return {
        ...actual,
        SmartVaultDB: {
            ...actual.SmartVaultDB,
            getSignedUrl: vi.fn(),
        },
    };
});

vi.mock('@/app/services/vaultBlobStore', () => ({
    buildVaultIdbPath: (userId: string, docId: string) => `idb:vault:${userId}:${docId}`,
    isVaultIdbStoragePath: (path: string) => path.startsWith('idb:vault:'),
    parseVaultIdbPath: (path: string) => {
        if (!path.startsWith('idb:vault:')) return null;
        const [, , userId, ...rest] = path.split(':');
        return { userId, docId: rest.join(':') };
    },
    getVaultBlobObjectUrl: vi.fn(),
    putVaultBlob: vi.fn(),
    deleteVaultBlobByPath: vi.fn(),
}));

import { SmartVaultDB } from '@/app/services/lawyer-cloud';
import { getVaultBlobObjectUrl } from '@/app/services/vaultBlobStore';

const baseDoc = (overrides: Partial<SmartVaultDoc> = {}): SmartVaultDoc => ({
    id: 'doc-1',
    title: 'test',
    type: 'pdf',
    tags: [],
    authorId: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileSize: 1024,
    fileName: 'test.pdf',
    mimeType: 'application/pdf',
    storagePath: 'u1/vault/file.pdf',
    signedUrl: null,
    isProcessing: false,
    boundDossierId: null,
    ...overrides,
});

describe('isVaultDocImage / isVaultDocPdf', () => {
    it('detects image docs', () => {
        expect(isVaultDocImage(baseDoc({ type: 'image', mimeType: 'image/jpeg' }))).toBe(true);
        expect(isVaultDocPdf(baseDoc({ type: 'image', mimeType: 'image/jpeg' }))).toBe(false);
    });

    it('detects pdf docs', () => {
        expect(isVaultDocPdf(baseDoc())).toBe(true);
        expect(isVaultDocImage(baseDoc())).toBe(false);
    });
});

describe('isVaultDocLocal', () => {
    it('returns true for local and idb storage paths', () => {
        expect(isVaultDocLocal(baseDoc({ storagePath: 'local:vault:u1:123' }))).toBe(true);
        expect(isVaultDocLocal(baseDoc({ storagePath: 'idb:vault:u1:doc-1' }))).toBe(true);
    });
});

describe('isVaultPdfFile', () => {
    it('accepts pdf mime or extension', () => {
        expect(isVaultPdfFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(true);
        expect(isVaultPdfFile(new File(['x'], 'a.pdf', { type: '' }))).toBe(true);
        expect(isVaultPdfFile(new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBe(false);
    });
});

describe('resolveVaultDocUrl', () => {
    beforeEach(() => {
        vi.mocked(SmartVaultDB.getSignedUrl).mockReset();
        vi.mocked(getVaultBlobObjectUrl).mockReset();
    });

    it('returns local data url for offline vault files', async () => {
        const url = 'data:application/pdf;base64,abc';
        const doc = baseDoc({ storagePath: 'local:vault:u1:1', signedUrl: url });
        await expect(resolveVaultDocUrl(doc)).resolves.toBe(url);
        expect(SmartVaultDB.getSignedUrl).not.toHaveBeenCalled();
    });

    it('returns blob url for idb vault files', async () => {
        vi.mocked(getVaultBlobObjectUrl).mockResolvedValue('blob:idb-preview');
        const doc = baseDoc({ id: 'doc-1', storagePath: 'idb:vault:u1:doc-1', signedUrl: null });
        await expect(resolveVaultDocUrl(doc)).resolves.toBe('blob:idb-preview');
        expect(getVaultBlobObjectUrl).toHaveBeenCalledWith('u1', 'doc-1');
    });

    it('returns null when local file has no signedUrl', async () => {
        const doc = baseDoc({ storagePath: 'local:vault:u1:1', signedUrl: null });
        await expect(resolveVaultDocUrl(doc)).resolves.toBeNull();
    });

    it('refreshes cloud signed url from storage', async () => {
        vi.mocked(SmartVaultDB.getSignedUrl).mockResolvedValue('https://fresh.example/pdf');
        const doc = baseDoc({ storagePath: 'u1/vault/old.pdf', signedUrl: 'https://expired.example/pdf' });
        await expect(resolveVaultDocUrl(doc)).resolves.toBe('https://fresh.example/pdf');
        expect(SmartVaultDB.getSignedUrl).toHaveBeenCalledWith('u1/vault/old.pdf');
    });

    it('falls back to cached signedUrl when refresh fails', async () => {
        vi.mocked(SmartVaultDB.getSignedUrl).mockResolvedValue(null);
        const cached = 'https://cached.example/pdf';
        const doc = baseDoc({ storagePath: 'u1/vault/file.pdf', signedUrl: cached });
        await expect(resolveVaultDocUrl(doc)).resolves.toBe(cached);
    });
});
