import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { SmartVaultDoc } from '@/app/services/lawyer-cloud';
import {
    normalizeVaultDocForLocalPersist,
    readVaultLocalIndex,
    readVaultLocalIndexSync,
    resetVaultLocalIndexForTests,
    scheduleVaultLocalIndexPersist,
    flushVaultLocalIndexPersist,
    upsertVaultLocalIndexDoc,
    upsertVaultLocalIndexDocImmediate,
    upsertVaultLocalIndexDocAndFlush,
    writeVaultLocalIndexSync,
    removeVaultLocalIndexDoc,
    isVaultDocDeleted,
} from '@/app/services/vault/vaultLocalIndex';

const syncStore = new Map<string, string>();
const setItemMock = vi.fn(async (key: string, value: string) => {
    syncStore.set(key, value);
});
const getItemMock = vi.fn(async (key: string) => syncStore.get(key) ?? null);

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        getItem: (...args: unknown[]) => getItemMock(...args),
        setItem: (...args: unknown[]) => setItemMock(...args),
        getItemSync: (key: string) => syncStore.get(key) ?? null,
        setItemSync: (key: string, value: string) => {
            syncStore.set(key, value);
        },
    },
}));

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
    storagePath: 'idb:vault:u1:doc-1',
    signedUrl: 'data:application/pdf;base64,abc',
    isProcessing: false,
    boundDossierId: null,
    ...overrides,
});

describe('vaultLocalIndex', () => {
    beforeEach(() => {
        resetVaultLocalIndexForTests();
        syncStore.clear();
        setItemMock.mockClear();
        getItemMock.mockClear();
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('hami:smartvault:mirror:v1');
        }
    });

    it('strips heavy signedUrl for idb storage paths', () => {
        const normalized = normalizeVaultDocForLocalPersist(baseDoc());
        expect(normalized.signedUrl).toBeNull();
        expect(normalized.storagePath).toBe('idb:vault:u1:doc-1');
    });

    it('upserts immediately without awaiting storage', () => {
        const docs = upsertVaultLocalIndexDocImmediate(baseDoc({ id: 'doc-fast', title: 'سريع' }));
        expect(docs).toHaveLength(1);
        expect(docs[0]?.title).toBe('سريع');
        expect(setItemMock).not.toHaveBeenCalled();
        expect(readVaultLocalIndexSync()[0]?.id).toBe('doc-fast');
    });

    it('reads from localStorage mirror on cold start', () => {
        const existing = [baseDoc({ id: 'mirror-doc', title: 'مرآة' })];
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('hami:smartvault:mirror:v1', JSON.stringify(existing));
        }
        resetVaultLocalIndexForTests();
        const docs = readVaultLocalIndexSync();
        expect(docs.some((d) => d.id === 'mirror-doc')).toBe(true);
    });

    it('schedules lightweight persist without blocking', async () => {
        scheduleVaultLocalIndexPersist([baseDoc({ signedUrl: null })]);
        expect(setItemMock).not.toHaveBeenCalled();
        await flushVaultLocalIndexPersist();
        expect(setItemMock).toHaveBeenCalledTimes(1);
        const payload = setItemMock.mock.calls[0]?.[1] as string;
        expect(payload.includes('data:')).toBe(false);
    });

    it('reads from memory after schedule', async () => {
        scheduleVaultLocalIndexPersist([baseDoc({ id: 'doc-2', signedUrl: null })]);
        const docs = await readVaultLocalIndex();
        expect(docs).toHaveLength(1);
        expect(docs[0]?.id).toBe('doc-2');
    });

    it('upserts a doc in memory without awaiting storage', async () => {
        upsertVaultLocalIndexDoc(baseDoc({ id: 'doc-3', title: 'new' }));
        await new Promise((resolve) => setTimeout(resolve, 0));
        const docs = await readVaultLocalIndex();
        expect(docs).toHaveLength(1);
        expect(docs[0]?.title).toBe('new');
    });

    it('merges with existing stored docs instead of wiping them on first save', async () => {
        const existing = [baseDoc({ id: 'doc-old', title: 'قديم' })];
        syncStore.set('hami:smartvault:docs:v1', JSON.stringify(existing));

        await upsertVaultLocalIndexDocAndFlush(baseDoc({ id: 'doc-new', title: 'جديد' }));

        const payload = JSON.parse(syncStore.get('hami:smartvault:docs:v1') as string) as SmartVaultDoc[];
        expect(payload).toHaveLength(2);
        expect(payload.map((doc) => doc.id).sort()).toEqual(['doc-new', 'doc-old']);
    });

    it('does not drop a newer in-memory doc when scheduling a stale persist', async () => {
        const stale = [baseDoc({ id: 'doc-old', title: 'قديم' })];
        const fresh = baseDoc({ id: 'doc-new', title: 'جديد', updatedAt: new Date().toISOString() });
        writeVaultLocalIndexSync([fresh]);
        scheduleVaultLocalIndexPersist(stale);
        const docs = await readVaultLocalIndex();
        expect(docs.some((doc) => doc.id === 'doc-new')).toBe(true);
        expect(docs.some((doc) => doc.id === 'doc-old')).toBe(true);
    });

    it('removeVaultLocalIndexDoc لا يعيد الملف بعد flush حتى مع بيانات قديمة على القرص', async () => {
        const keep = baseDoc({ id: 'doc-keep', title: 'يبقى' });
        const doomed = baseDoc({ id: 'doc-gone', title: 'يُحذف' });
        upsertVaultLocalIndexDocImmediate(keep);
        upsertVaultLocalIndexDocImmediate(doomed);
        await flushVaultLocalIndexPersist();

        removeVaultLocalIndexDoc('doc-gone', 'u1');
        await flushVaultLocalIndexPersist();

        const docs = readVaultLocalIndexSync();
        expect(docs.some((d) => d.id === 'doc-gone')).toBe(false);
        expect(docs.some((d) => d.id === 'doc-keep')).toBe(true);
        expect(isVaultDocDeleted('u1', 'doc-gone')).toBe(true);
    });
});
