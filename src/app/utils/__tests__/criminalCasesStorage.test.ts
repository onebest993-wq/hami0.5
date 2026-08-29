import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecureStoreService from '@/app/services/SecureStoreService';
import {
    CRIMINAL_STORE_KEY,
    CRIMINAL_STORAGE_PATCHED_EVENT,
    CRIMINAL_CARD_INDEX_KEY,
    loadCriminalCasesRaw,
    loadCriminalCaseRecordByIdSync,
    loadCriminalCasesCardIndexSync,
    patchCriminalCaseRecord,
    purgeCriminalCaseRecord,
} from '@/app/utils/criminalCasesStorage';
import { parseCriminalCardIndex } from '@/app/utils/criminalCaseCardIndex';
import { CRIMINAL_CASE_PREFIX, CRIMINAL_META_KEY } from '@/app/services/criminalShardedPersistStorage';

describe('criminalCasesStorage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        SecureStoreService.listKeysSync().forEach((key) => SecureStoreService.deleteItemSync(key));
        localStorage.clear();
    });

    it('يرحّل بقايا المونولث إلى شظايا ويمحو الجذر الصريح', () => {
        SecureStoreService.setItemSync(
            CRIMINAL_STORE_KEY,
            JSON.stringify({
                state: {
                    casesById: {
                        a: { id: 'a', title: 'old' },
                    },
                },
            }),
        );
        expect(loadCriminalCasesRaw()).toEqual([{ id: 'a', title: 'old' }]);
        expect(SecureStoreService.getItemSync(CRIMINAL_STORE_KEY)).toBeNull();
        expect(JSON.parse(SecureStoreService.getItemSync(`${CRIMINAL_CASE_PREFIX}a`) ?? '{}')).toEqual({
            id: 'a',
            title: 'old',
        });
    });

    it('refreshes cached cases when a shard changes out of band', () => {
        SecureStoreService.setItemSync(
            CRIMINAL_META_KEY,
            JSON.stringify({ sharded: true, caseIds: ['a'], state: {} }),
        );
        SecureStoreService.setItemSync(`${CRIMINAL_CASE_PREFIX}a`, JSON.stringify({ id: 'a', title: 'old' }));
        expect(loadCriminalCasesRaw()).toEqual([{ id: 'a', title: 'old' }]);

        SecureStoreService.setItemSync(`${CRIMINAL_CASE_PREFIX}a`, JSON.stringify({ id: 'a', title: 'new' }));
        expect(loadCriminalCasesRaw()).toEqual([{ id: 'a', title: 'new' }]);
    });

    it('does not return stale cached cases after shard deletion', () => {
        SecureStoreService.setItemSync(
            CRIMINAL_META_KEY,
            JSON.stringify({ sharded: true, caseIds: ['a'], state: {} }),
        );
        SecureStoreService.setItemSync(`${CRIMINAL_CASE_PREFIX}a`, JSON.stringify({ id: 'a', title: 'gone' }));
        expect(loadCriminalCasesRaw()).toEqual([{ id: 'a', title: 'gone' }]);

        SecureStoreService.deleteItemSync(`${CRIMINAL_CASE_PREFIX}a`);
        SecureStoreService.deleteItemSync(CRIMINAL_META_KEY);
        expect(loadCriminalCasesRaw()).toEqual([]);
    });

    it('patches the root once and dispatches the merge event', () => {
        vi.useFakeTimers();
        const setItemSyncSpy = vi.spyOn(SecureStoreService, 'setItemSync');
        const eventSpy = vi.fn();
        window.addEventListener(CRIMINAL_STORAGE_PATCHED_EVENT, eventSpy);

        SecureStoreService.setItemSync(
            CRIMINAL_STORE_KEY,
            JSON.stringify({
                state: {
                    casesById: {
                        c1: {
                            id: 'c1',
                            location: { nextHearingDate: '2028-01-01' },
                        },
                    },
                },
            }),
        );

        setItemSyncSpy.mockClear();

        const ok = patchCriminalCaseRecord('c1', (row) => ({
            ...row,
            location: { nextHearingDate: '2028-09-20' },
        }));

        expect(ok).toBe(true);
        expect(setItemSyncSpy).toHaveBeenCalledWith(`${CRIMINAL_CASE_PREFIX}c1`, expect.any(String));
        expect(setItemSyncSpy).toHaveBeenCalledWith(CRIMINAL_META_KEY, expect.any(String));
        expect(setItemSyncSpy).toHaveBeenCalledWith(CRIMINAL_CARD_INDEX_KEY, expect.any(String));
        expect(setItemSyncSpy).not.toHaveBeenCalledWith(CRIMINAL_STORE_KEY, expect.any(String));
        expect(eventSpy).toHaveBeenCalledTimes(1);

        expect(SecureStoreService.getItemSync(CRIMINAL_STORE_KEY)).toBeNull();
        const shard = JSON.parse(SecureStoreService.getItemSync(`${CRIMINAL_CASE_PREFIX}c1`) ?? '{}') as {
            location?: { nextHearingDate?: string };
        };
        expect(shard.location?.nextHearingDate).toBe('2028-09-20');
        expect(loadCriminalCasesCardIndexSync().map((e) => e.id)).toEqual(['c1']);
        expect(parseCriminalCardIndex(SecureStoreService.getItemSync(CRIMINAL_CARD_INDEX_KEY))).toEqual(
            expect.arrayContaining([expect.objectContaining({ id: 'c1' })]),
        );

        window.removeEventListener(CRIMINAL_STORAGE_PATCHED_EVENT, eventSpy);
        vi.useRealTimers();
    });

    it('patches a sharded case when unified root is empty', () => {
        SecureStoreService.setItemSync(
            `${CRIMINAL_CASE_PREFIX}s1`,
            JSON.stringify({
                id: 's1',
                location: { nextHearingDate: '2028-01-01' },
            }),
        );

        const ok = patchCriminalCaseRecord('s1', (row) => ({
            ...row,
            location: { nextHearingDate: '2028-11-11' },
        }));
        expect(ok).toBe(true);
        const raw = SecureStoreService.getItemSync(`${CRIMINAL_CASE_PREFIX}s1`);
        expect(JSON.parse(raw ?? '{}').location.nextHearingDate).toBe('2028-11-11');
    });

    it('loads a single case by id from its shard', () => {
        SecureStoreService.setItemSync(
            `${CRIMINAL_CASE_PREFIX}solo`,
            JSON.stringify({ id: 'solo', basics: { crimeType: 'سرقة' } }),
        );
        expect(loadCriminalCaseRecordByIdSync('solo')).toEqual(
            expect.objectContaining({ id: 'solo', basics: { crimeType: 'سرقة' } }),
        );
    });

    it('purges shard and card index for a case id', () => {
        SecureStoreService.setItemSync(
            `${CRIMINAL_CASE_PREFIX}gone`,
            JSON.stringify({ id: 'gone', title: 'x' }),
        );
        SecureStoreService.setItemSync(
            CRIMINAL_CARD_INDEX_KEY,
            JSON.stringify({ v: 1, entries: [{ id: 'gone' }, { id: 'keep' }] }),
        );

        expect(purgeCriminalCaseRecord('gone')).toBe(true);
        expect(SecureStoreService.getItemSync(`${CRIMINAL_CASE_PREFIX}gone`)).toBeNull();
        expect(loadCriminalCasesCardIndexSync().map((e) => e.id)).toEqual(['keep']);
    });

    it('prefers sharded cases over a stale unified root', () => {
        SecureStoreService.setItemSync(
            CRIMINAL_STORE_KEY,
            JSON.stringify({
                state: {
                    casesById: {
                        stale: { id: 'stale', title: 'legacy-only' },
                    },
                },
            }),
        );
        SecureStoreService.setItemSync(
            'hami:criminal:meta',
            JSON.stringify({
                sharded: true,
                caseIds: ['live'],
                state: {},
            }),
        );
        SecureStoreService.setItemSync(
            `${CRIMINAL_CASE_PREFIX}live`,
            JSON.stringify({ id: 'live', title: 'from-shard' }),
        );

        const rows = loadCriminalCasesRaw();
        expect(rows).toEqual([expect.objectContaining({ id: 'live', title: 'from-shard' })]);
        expect(rows.find((row) => row.id === 'stale')).toBeUndefined();
        expect(SecureStoreService.getItemSync(CRIMINAL_STORE_KEY)).toBeNull();
        expect(loadCriminalCaseRecordByIdSync('live')).toEqual(
            expect.objectContaining({ id: 'live', title: 'from-shard' }),
        );
    });

    it('يرحّل leftover المونولث من localStorage إلى شظايا ويمحو LS دون إعادة تشفير الجذر', () => {
        localStorage.setItem(
            CRIMINAL_STORE_KEY,
            JSON.stringify({
                state: {
                    casesById: {
                        ls1: { id: 'ls1', title: 'من المرآة' },
                    },
                },
            }),
        );
        expect(loadCriminalCasesRaw()).toEqual([expect.objectContaining({ id: 'ls1', title: 'من المرآة' })]);
        expect(localStorage.getItem(CRIMINAL_STORE_KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(CRIMINAL_STORE_KEY)).toBeNull();
        expect(JSON.parse(SecureStoreService.getItemSync(`${CRIMINAL_CASE_PREFIX}ls1`) ?? '{}')).toEqual({
            id: 'ls1',
            title: 'من المرآة',
        });
    });

    it('يرحّل leftover فهرس البطاقات ويمحوه', () => {
        localStorage.setItem(
            CRIMINAL_CARD_INDEX_KEY,
            JSON.stringify({ v: 1, entries: [{ id: 'idx-ls', title: 'قضية leftover' }] }),
        );
        expect(loadCriminalCasesCardIndexSync().map((e) => e.id)).toEqual(['idx-ls']);
        expect(localStorage.getItem(CRIMINAL_CARD_INDEX_KEY)).toBeNull();
        expect(SecureStoreService.getItemSync(CRIMINAL_CARD_INDEX_KEY)).toContain('idx-ls');
    });
});
