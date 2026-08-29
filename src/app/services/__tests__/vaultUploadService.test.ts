import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SmartVaultDoc } from '@/app/services/vault/vaultTypes';
import {
    isVaultDocImage,
    isVaultDocPdf,
    isVaultDocLocal,
    isVaultPdfFile,
    isVaultImageFile,
    resolveVaultDocUrl,
    resolveVaultDocForViewing,
    toVaultPdfViewerUrl,
    uploadVaultFileWithFallback,
    blobFromScanImageSource,
} from '@/app/services/vaultUploadService';

vi.mock('@/app/services/lawyer-cloud', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/lawyer-cloud')>();
    return {
        ...actual,
        uuidv4: () => 'doc-test-id',
    };
});

vi.mock('@/app/services/vault/smartVaultRuntime', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/vault/smartVaultRuntime')>();
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
    getVaultBlob: vi.fn(),
    peekVaultBlob: vi.fn(() => null),
    primeVaultBlobCache: vi.fn(),
    prefetchVaultBlobStore: vi.fn(),
    waitForVaultBlobWrites: vi.fn(async () => undefined),
    putVaultBlob: vi.fn(),
    deleteVaultBlobByPath: vi.fn(),
}));

import { SmartVaultDB } from '@/app/services/vault/smartVaultRuntime';
import { getVaultBlob, getVaultBlobObjectUrl, peekVaultBlob, putVaultBlob } from '@/app/services/vaultBlobStore';

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

    it('detects image by mime even when type is pdf', () => {
        const misclassified = baseDoc({ type: 'pdf', mimeType: 'image/jpeg', fileName: 'photo.jpg' });
        expect(isVaultDocImage(misclassified)).toBe(true);
        expect(isVaultDocPdf(misclassified)).toBe(false);
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

    it('rejects svg even with an image mime', () => {
        expect(isVaultImageFile(new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }))).toBe(false);
        expect(isVaultImageFile(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))).toBe(true);
        expect(isVaultPdfFile(new File(['x'], 'a.svg', { type: 'application/pdf' }))).toBe(false);
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
        expect(getVaultBlobObjectUrl).toHaveBeenCalledWith('u1', 'doc-1', {
            mimeType: 'application/pdf',
        });
    });

    it('does not reuse stale signed blob urls for idb vault files', async () => {
        vi.mocked(getVaultBlobObjectUrl).mockResolvedValue('blob:fresh-idb-preview');
        const doc = baseDoc({
            id: 'doc-1',
            storagePath: 'idb:vault:u1:doc-1',
            signedUrl: 'blob:http://localhost:8080/stale-preview',
        });
        await expect(resolveVaultDocUrl(doc)).resolves.toBe('blob:fresh-idb-preview');
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

    it('strips javascript preview urls', async () => {
        const doc = baseDoc({ storagePath: 'local:vault:u1:1', signedUrl: 'javascript:alert(1)' });
        await expect(resolveVaultDocUrl(doc)).resolves.toBeNull();
    });

    it('falls back to cached signedUrl when refresh fails', async () => {
        vi.mocked(SmartVaultDB.getSignedUrl).mockResolvedValue(null);
        const cached = 'https://cached.example/pdf';
        const doc = baseDoc({ storagePath: 'u1/vault/file.pdf', signedUrl: cached });
        await expect(resolveVaultDocUrl(doc)).resolves.toBe(cached);
    });

    it('refuses idb blobs whose path user does not match authorId', async () => {
        vi.mocked(getVaultBlobObjectUrl).mockResolvedValue('blob:stolen');
        const doc = baseDoc({
            authorId: 'u1',
            storagePath: 'idb:vault:u2:doc-1',
            signedUrl: null,
        });
        await expect(resolveVaultDocUrl(doc)).resolves.toBeNull();
        expect(getVaultBlobObjectUrl).not.toHaveBeenCalled();
    });
});

describe('resolveVaultDocForViewing', () => {
    beforeEach(() => {
        vi.mocked(getVaultBlob).mockReset();
        vi.mocked(getVaultBlobObjectUrl).mockReset();
        vi.mocked(peekVaultBlob).mockReset();
        vi.mocked(peekVaultBlob).mockReturnValue(null);
    });

    it('opens from idb blob url', async () => {
        vi.mocked(getVaultBlobObjectUrl).mockResolvedValue('blob:idb-preview');
        const doc = baseDoc({ id: 'doc-1', storagePath: 'idb:vault:u1:doc-1' });
        const payload = await resolveVaultDocForViewing(doc);
        expect(payload?.url).toBe('blob:idb-preview');
        expect(payload?.kind).toBe('pdf');
    });

    it('creates preview url when blob exists but object url resolver fails', async () => {
        const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
        vi.mocked(getVaultBlob).mockResolvedValue(pdfBlob);
        vi.mocked(getVaultBlobObjectUrl).mockResolvedValue(null);
        const createObjectURL = vi.fn(() => 'blob:from-blob');
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
        const doc = baseDoc({ id: 'doc-2', storagePath: 'idb:vault:u1:doc-2' });
        const payload = await resolveVaultDocForViewing(doc);
        expect(payload?.url).toBe('blob:from-blob');
        expect(payload?.blob).toBe(pdfBlob);
        expect(payload?.revokeOnClose).toBe(true);
        expect(createObjectURL).toHaveBeenCalled();
    });

    it('falls back to https signedUrl when local blob missing', async () => {
        vi.mocked(getVaultBlobObjectUrl).mockResolvedValue(null);
        vi.mocked(getVaultBlob).mockResolvedValue(null);
        const cached = 'https://cdn.example/doc.pdf';
        const doc = baseDoc({
            storagePath: 'idb:vault:u1:doc-3',
            signedUrl: cached,
        });
        const payload = await resolveVaultDocForViewing(doc);
        expect(payload?.url).toBe(cached);
        expect(payload?.revokeOnClose).toBe(false);
    });
});

describe('toVaultPdfViewerUrl', () => {
    it('normalizes octet-stream blob to application/pdf for inline viewer', async () => {
        const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
        const blob = new Blob([pdfBytes], { type: 'application/octet-stream' });
        const createObjectURL = vi.fn(() => 'blob:normalized');
        Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
        global.fetch = vi.fn(async () => new Response(blob)) as typeof fetch;
        const viewerUrl = await toVaultPdfViewerUrl('blob:source');
        expect(viewerUrl).toBe('blob:normalized');
        expect(createObjectURL).toHaveBeenCalled();
    });
});

describe('uploadVaultFileWithFallback', () => {
    beforeEach(() => {
        vi.mocked(putVaultBlob).mockReset();
    });

    it('stores large pdf files locally in idb without cloud upload', async () => {
        vi.mocked(putVaultBlob).mockResolvedValue(undefined);

        const file = new File([new Uint8Array(600 * 1024)], 'big.pdf', {
            type: 'application/pdf',
        });
        const result = uploadVaultFileWithFallback('u1', file, { docId: 'doc-1' });

        expect(result.localOnly).toBe(true);
        expect(result.storagePath).toBe('idb:vault:u1:doc-1');
        expect(putVaultBlob).toHaveBeenCalled();
    });

    it('stores small pdf files in idb with blob preview', async () => {
        vi.mocked(putVaultBlob).mockResolvedValue(undefined);
        const createObjectURL = vi.fn(() => 'blob:preview-pdf');
        const originalCreateObjectURL = URL.createObjectURL;
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: createObjectURL,
        });

        try {
            const file = new File(['pdf'], 'small.pdf', {
                type: 'application/pdf',
            });
            const result = uploadVaultFileWithFallback('u1', file, { docId: 'doc-2' });

            expect(result.localOnly).toBe(true);
            expect(result.storagePath).toBe('idb:vault:u1:doc-2');
            expect(result.signedUrl).toBe('blob:preview-pdf');
            expect(putVaultBlob).toHaveBeenCalled();
            expect(createObjectURL).toHaveBeenCalledWith(file);
        } finally {
            Object.defineProperty(URL, 'createObjectURL', {
                configurable: true,
                writable: true,
                value: originalCreateObjectURL,
            });
        }
    });

    it('stores images in idb with an instant blob preview url', () => {
        vi.mocked(putVaultBlob).mockResolvedValue(undefined);
        const createObjectURL = vi.fn(() => 'blob:preview-image');
        const originalCreateObjectURL = URL.createObjectURL;
        Object.defineProperty(URL, 'createObjectURL', {
            configurable: true,
            writable: true,
            value: createObjectURL,
        });

        try {
            const file = new File([new Uint8Array(64 * 1024)], 'photo.jpg', {
                type: 'image/jpeg',
            });
            const result = uploadVaultFileWithFallback('u1', file, { docId: 'img-1' });

            expect(result.localOnly).toBe(true);
            expect(result.storagePath).toBe('idb:vault:u1:img-1');
            expect(result.signedUrl).toBe('blob:preview-image');
            expect(putVaultBlob).toHaveBeenCalled();
            expect(createObjectURL).toHaveBeenCalledWith(file);
        } finally {
            Object.defineProperty(URL, 'createObjectURL', {
                configurable: true,
                writable: true,
                value: originalCreateObjectURL,
            });
        }
    });
});

describe('blobFromScanImageSource', () => {
    it('يعيد Blob كما هو دون فك ترميز', async () => {
        const blob = new Blob(['scan'], { type: 'image/jpeg' });
        await expect(blobFromScanImageSource(blob)).resolves.toEqual({ blob });
    });

    it('يفك data URL دون fetch', async () => {
        const { blob, fallbackDataUrl } = await blobFromScanImageSource('data:image/jpeg;base64,QQ==');
        expect(blob.size).toBeGreaterThan(0);
        expect(blob.type).toBe('image/jpeg');
        expect(fallbackDataUrl).toContain('data:image/jpeg');
    });

    it('يرفض مصادر المسح الشبكية وdata غير الصورة', async () => {
        await expect(blobFromScanImageSource('https://evil.example/x.jpg')).rejects.toThrow(/invalid scan source/);
        await expect(blobFromScanImageSource('data:text/html,<script>x</script>')).rejects.toThrow();
        await expect(blobFromScanImageSource('javascript:alert(1)')).rejects.toThrow(/invalid scan source/);
    });
});
