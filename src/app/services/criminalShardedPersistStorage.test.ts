import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    CRIMINAL_CASE_PREFIX,
    CRIMINAL_META_KEY,
    CRIMINAL_STORE_KEY,
    createCriminalShardedStateStorage,
    waitForCriminalShardedFlush,
} from './criminalShardedPersistStorage';

describe('criminalShardedPersistStorage', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.spyOn(SecureStoreService, 'ensurePersistedReady').mockResolvedValue(undefined);
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('writes meta + case shards after debounce', async () => {
        const store = new Map<string, string>();
        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        vi.spyOn(SecureStoreService, 'setItem').mockImplementation(async (key, value) => {
            store.set(key, value);
        });
        vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });
        vi.spyOn(SecureStoreService, 'listKeys').mockResolvedValue([]);

        const storage = createCriminalShardedStateStorage({ debounceMs: 500 });
        const payload = JSON.stringify({
            state: {
                casesById: {
                    c1: { id: 'c1', title: 'Case 1' },
                    c2: { id: 'c2', title: 'Case 2' },
                },
                draft: {},
            },
            version: 49,
        });

        await storage.setItem(CRIMINAL_STORE_KEY, payload);
        expect(store.has(CRIMINAL_META_KEY)).toBe(false);

        await vi.advanceTimersByTimeAsync(500);
        await Promise.resolve();

        expect(store.has(CRIMINAL_META_KEY)).toBe(true);
        expect(store.has(`${CRIMINAL_CASE_PREFIX}c1`)).toBe(true);
        expect(store.has(`${CRIMINAL_CASE_PREFIX}c2`)).toBe(true);

        const meta = JSON.parse(store.get(CRIMINAL_META_KEY)!);
        expect(meta.sharded).toBe(true);
        expect(meta.caseIds).toEqual(['c1', 'c2']);
    });

    it('splits large case shards into encryptable chunks', async () => {
        const store = new Map<string, string>();
        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        vi.spyOn(SecureStoreService, 'setItem').mockImplementation(async (key, value) => {
            store.set(key, value);
        });
        vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });
        vi.spyOn(SecureStoreService, 'listKeys').mockImplementation(async () => Array.from(store.keys()));

        const storage = createCriminalShardedStateStorage({ debounceMs: 100 });
        const bigPayload = 'x'.repeat(300 * 1024);
        const payload = JSON.stringify({
            state: {
                casesById: {
                    big: { id: 'big', data: bigPayload },
                },
            },
            version: 1,
        });

        await storage.setItem(CRIMINAL_STORE_KEY, payload);
        await vi.advanceTimersByTimeAsync(100);
        await Promise.resolve();

        expect(store.has(`${CRIMINAL_CASE_PREFIX}big__manifest`)).toBe(true);
        expect(store.has(`${CRIMINAL_CASE_PREFIX}big`)).toBe(false);

        const raw = await storage.getItem(CRIMINAL_STORE_KEY);
        const parsed = JSON.parse(raw!);
        expect(parsed.state.casesById.big.data.length).toBe(300 * 1024);
    });

    it('reassembles sharded payload on getItem', async () => {
        const store = new Map<string, string>([
            [
                CRIMINAL_META_KEY,
                JSON.stringify({
                    sharded: true,
                    version: 49,
                    caseIds: ['c1'],
                    state: { draft: {} },
                }),
            ],
            [`${CRIMINAL_CASE_PREFIX}c1`, JSON.stringify({ id: 'c1', title: 'X' })],
        ]);

        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });

        const storage = createCriminalShardedStateStorage();
        const raw = await storage.getItem(CRIMINAL_STORE_KEY);
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw!);
        expect(parsed.state.casesById.c1.title).toBe('X');
    });

    it('deletes legacy monolith after successful shard reassembly on getItem', async () => {
        const store = new Map<string, string>([
            [
                CRIMINAL_META_KEY,
                JSON.stringify({
                    sharded: true,
                    version: 49,
                    caseIds: ['c1'],
                    state: { draft: {} },
                }),
            ],
            [`${CRIMINAL_CASE_PREFIX}c1`, JSON.stringify({ id: 'c1', title: 'X' })],
            [CRIMINAL_STORE_KEY, JSON.stringify({ state: { casesById: { orphan: {} } }, version: 1 })],
        ]);

        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        const deleteItem = vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });

        const storage = createCriminalShardedStateStorage();
        await storage.getItem(CRIMINAL_STORE_KEY);

        expect(deleteItem).toHaveBeenCalledWith(CRIMINAL_STORE_KEY);
        expect(store.has(CRIMINAL_STORE_KEY)).toBe(false);
    });

    it('deletes legacy name after successful meta+shards write even if orphaned empty blob', async () => {
        const store = new Map<string, string>([
            [CRIMINAL_STORE_KEY, JSON.stringify({ state: { casesById: {} }, version: 1 })],
        ]);
        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        vi.spyOn(SecureStoreService, 'setItem').mockImplementation(async (key, value) => {
            store.set(key, value);
        });
        const deleteItem = vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });
        vi.spyOn(SecureStoreService, 'listKeys').mockResolvedValue([]);

        const storage = createCriminalShardedStateStorage({ debounceMs: 50 });
        await storage.setItem(
            CRIMINAL_STORE_KEY,
            JSON.stringify({
                state: { casesById: { c1: { id: 'c1' } } },
                version: 49,
            }),
        );
        await vi.advanceTimersByTimeAsync(50);
        await Promise.resolve();

        expect(store.has(CRIMINAL_META_KEY)).toBe(true);
        expect(deleteItem).toHaveBeenCalledWith(CRIMINAL_STORE_KEY);
        expect(store.has(CRIMINAL_STORE_KEY)).toBe(false);
    });

    it('skips shard write for marked card-index stubs but keeps caseId in meta', async () => {
        const store = new Map<string, string>();
        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        vi.spyOn(SecureStoreService, 'setItem').mockImplementation(async (key, value) => {
            store.set(key, value);
        });
        vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });
        vi.spyOn(SecureStoreService, 'listKeys').mockResolvedValue([]);

        const storage = createCriminalShardedStateStorage({ debounceMs: 50 });
        const payload = JSON.stringify({
            state: {
                casesById: {
                    full: { id: 'full', createdAt: '2026-01-01', title: 'Full' },
                    stub: { id: 'stub', _cardIndexStub: true, basics: { stage: 'x' } },
                },
            },
            version: 49,
        });

        await storage.setItem(CRIMINAL_STORE_KEY, payload);
        await vi.advanceTimersByTimeAsync(50);
        await Promise.resolve();

        expect(store.has(`${CRIMINAL_CASE_PREFIX}full`)).toBe(true);
        expect(store.has(`${CRIMINAL_CASE_PREFIX}stub`)).toBe(false);
        const meta = JSON.parse(store.get(CRIMINAL_META_KEY)!);
        expect(meta.caseIds).toEqual(['full', 'stub']);
    });

    it('does not surface unhandled rejection when shard persist throws StorageEncryptionError', async () => {
        const { StorageEncryptionError } = await import('@/app/services/SecureStoreService');
        const rejections: unknown[] = [];
        const onUnhandled = (reason: unknown) => {
            rejections.push(reason);
        };
        process.on('unhandledRejection', onUnhandled);
        try {
            vi.spyOn(SecureStoreService, 'getItem').mockResolvedValue(null);
            vi.spyOn(SecureStoreService, 'setItem').mockRejectedValue(
                new StorageEncryptionError('hami:criminal:meta'),
            );
            vi.spyOn(SecureStoreService, 'deleteItem').mockResolvedValue(undefined);
            vi.spyOn(SecureStoreService, 'listKeys').mockResolvedValue([]);

            const storage = createCriminalShardedStateStorage({ debounceMs: 50 });
            await storage.setItem(
                CRIMINAL_STORE_KEY,
                JSON.stringify({
                    state: { casesById: { c1: { id: 'c1' } } },
                    version: 49,
                }),
            );
            await vi.advanceTimersByTimeAsync(50);
            await Promise.resolve();
            await Promise.resolve();

            expect(rejections).toEqual([]);
        } finally {
            process.off('unhandledRejection', onUnhandled);
        }
    });

    it('يرحّل بقايا المونولث عند القراءة دون انتظار debounce الكتابة', async () => {
        const leftover = JSON.stringify({
            state: { casesById: { c1: { id: 'c1', title: 'legacy' } } },
            version: 49,
        });
        const store = new Map<string, string>([[CRIMINAL_STORE_KEY, leftover]]);
        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        vi.spyOn(SecureStoreService, 'setItem').mockImplementation(async (key, value) => {
            store.set(key, value);
        });
        vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });
        vi.spyOn(SecureStoreService, 'listKeys').mockImplementation(async () => Array.from(store.keys()));

        const storage = createCriminalShardedStateStorage({ debounceMs: 8_000 });
        const raw = await storage.getItem(CRIMINAL_STORE_KEY);
        expect(JSON.parse(raw!).state.casesById.c1.title).toBe('legacy');

        await waitForCriminalShardedFlush();

        expect(store.has(CRIMINAL_STORE_KEY)).toBe(false);
        expect(store.has(CRIMINAL_META_KEY)).toBe(true);
        expect(store.has(`${CRIMINAL_CASE_PREFIX}c1`)).toBe(true);
    });

    it('لا يعيد كتابة المونولث عندما الحمولة ليست JSON', async () => {
        const store = new Map<string, string>();
        vi.spyOn(SecureStoreService, 'getItem').mockImplementation(async (key) => store.get(key) ?? null);
        vi.spyOn(SecureStoreService, 'setItem').mockImplementation(async (key, value) => {
            store.set(key, value);
        });
        vi.spyOn(SecureStoreService, 'deleteItem').mockImplementation(async (key) => {
            store.delete(key);
        });
        vi.spyOn(SecureStoreService, 'listKeys').mockResolvedValue([]);

        const storage = createCriminalShardedStateStorage({ debounceMs: 50 });
        await storage.setItem(CRIMINAL_STORE_KEY, 'not-json{{{');
        await vi.advanceTimersByTimeAsync(50);
        await waitForCriminalShardedFlush();

        expect(store.has(CRIMINAL_STORE_KEY)).toBe(false);
        expect(store.has(CRIMINAL_META_KEY)).toBe(false);
    });
});
