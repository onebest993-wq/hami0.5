import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    CRIMINAL_CASE_PREFIX,
    CRIMINAL_META_KEY,
    CRIMINAL_STORE_KEY,
    createCriminalShardedStateStorage,
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

        const storage = createCriminalShardedStateStorage();
        const raw = await storage.getItem(CRIMINAL_STORE_KEY);
        expect(raw).toBeTruthy();
        const parsed = JSON.parse(raw!);
        expect(parsed.state.casesById.c1.title).toBe('X');
    });
});
