import { describe, expect, it, vi, beforeEach } from 'vitest';
import { saveFileToVault } from '@/app/services/vaultUploadService';
import { peekVaultLocalIndex } from '@/app/services/vault/vaultLocalIndex';
import { resetVaultLocalIndexForTests } from '@/app/services/vault/vaultLocalIndex';

const syncStore = new Map<string, string>();

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: vi.fn(async (key: string) => syncStore.get(key) ?? null),
        setItem: vi.fn(async (key: string, value: string) => {
            syncStore.set(key, value);
        }),
        getItemSync: (key: string) => syncStore.get(key) ?? null,
        setItemSync: (key: string, value: string) => {
            syncStore.set(key, value);
        },
    },
}));

vi.mock('@/app/services/lawyer-cloud', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/lawyer-cloud')>();
    return {
        ...actual,
        uuidv4: () => 'flow-doc-id',
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
    peekVaultBlob: vi.fn(() => new Blob(['%PDF'], { type: 'application/pdf' })),
    primeVaultBlobCache: vi.fn(),
    putVaultBlob: vi.fn(async () => undefined),
    deleteVaultBlobByPath: vi.fn(),
}));

describe('vault save flow scenarios', () => {
    beforeEach(() => {
        resetVaultLocalIndexForTests();
        syncStore.clear();
    });

    it('scenario: رفع صورة — يحفظ الفهرس فوراً ولا يتعلّق', async () => {
        const file = new File([new Uint8Array(32 * 1024)], 'هوية.jpg', { type: 'image/jpeg' });
        const started = Date.now();
        const result = await saveFileToVault('guest-lawyer-1', file, { title: 'هوية الموكل' });
        const elapsed = Date.now() - started;

        expect(elapsed).toBeLessThan(2_000);
        expect(result.doc.title).toBe('هوية الموكل');
        expect(result.doc.authorId).toBe('guest-lawyer-1');
        expect(result.doc.storagePath).toBe('idb:vault:guest-lawyer-1:flow-doc-id');

        const index = peekVaultLocalIndex();
        expect(index?.some((d) => d.id === 'flow-doc-id')).toBe(true);
    });

    it('scenario: رفع PDF — يظهر في فهرس المستودع', async () => {
        const file = new File(['%PDF'], 'عقد.pdf', { type: 'application/pdf' });
        const result = await saveFileToVault('u1', file, { title: 'عقد البيع' });

        expect(result.doc.type).toBe('pdf');
        expect(result.doc.mimeType).toBe('application/pdf');
        const index = peekVaultLocalIndex();
        expect(index?.find((d) => d.id === result.doc.id)?.title).toBe('عقد البيع');
    });
});
