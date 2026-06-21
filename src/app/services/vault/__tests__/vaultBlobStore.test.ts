import { beforeEach, describe, expect, it } from 'vitest';
import {
    buildVaultIdbPath,
    parseVaultIdbPath,
    putVaultBlob,
    getVaultBlob,
    getVaultBlobObjectUrl,
    deleteVaultBlobByPath,
    clearVaultBlobTestStore,
} from '@/app/services/vaultBlobStore';

describe('vaultBlobStore', () => {
    beforeEach(() => {
        clearVaultBlobTestStore();
    });

    it('builds and parses idb paths', () => {
        const path = buildVaultIdbPath('lawyer-1', 'doc-abc');
        expect(path).toBe('idb:vault:lawyer-1:doc-abc');
        expect(parseVaultIdbPath(path)).toEqual({ userId: 'lawyer-1', docId: 'doc-abc' });
    });

    it('stores and retrieves blobs in test mode', async () => {
        const blob = new Blob(['pdf-bytes'], { type: 'application/pdf' });
        await putVaultBlob('lawyer-1', 'doc-1', blob, 'application/pdf');
        const hit = await getVaultBlob('lawyer-1', 'doc-1');
        expect(hit?.size).toBe(blob.size);
    });

    it('creates object URLs for stored blobs', async () => {
        const createObjectURL = vi.fn(() => 'blob:test-preview');
        vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL: vi.fn() });

        const blob = new Blob(['img'], { type: 'image/jpeg' });
        await putVaultBlob('u1', 'img-1', blob, 'image/jpeg');
        const url = await getVaultBlobObjectUrl('u1', 'img-1');
        expect(url).toBe('blob:test-preview');
        expect(createObjectURL).toHaveBeenCalled();
    });

    it('deletes blobs by storage path', async () => {
        const blob = new Blob(['x'], { type: 'application/pdf' });
        const path = buildVaultIdbPath('u1', 'del-me');
        await putVaultBlob('u1', 'del-me', blob, 'application/pdf');
        await deleteVaultBlobByPath(path);
        expect(await getVaultBlob('u1', 'del-me')).toBeNull();
    });
});
