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
import { CRIMINAL_CASE_PREFIX } from '@/app/services/criminalShardedPersistStorage';

describe('criminalCasesStorage', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        SecureStoreService.listKeysSync().forEach((key) => SecureStoreService.deleteItemSync(key));
    });

    it('refreshes cached cases when root storage changes out of band', () => {
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

        SecureStoreService.setItemSync(
            CRIMINAL_STORE_KEY,
            JSON.stringify({
                state: {
                    casesById: {
                        b: { id: 'b', title: 'new' },
                    },
                },
            }),
        );
        expect(loadCriminalCasesRaw()).toEqual([{ id: 'b', title: 'new' }]);
    });

    it('does not return stale cached cases after root deletion', () => {
        SecureStoreService.setItemSync(
            CRIMINAL_STORE_KEY,
            JSON.stringify({
                state: {
                    casesById: {
                        a: { id: 'a', title: 'gone' },
                    },
                },
            }),
        );
        expect(loadCriminalCasesRaw()).toEqual([{ id: 'a', title: 'gone' }]);

        SecureStoreService.deleteItemSync(CRIMINAL_STORE_KEY);
        expect(loadCriminalCasesRaw()).toEqual([]);
    });

    it('patches the root once and dispatches the merge event', () => {
        vi.useFakeTimers();
        const setItemSpy = vi.spyOn(SecureStoreService, 'setItem');
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

        const ok = patchCriminalCaseRecord('c1', (row) => ({
            ...row,
            location: { nextHearingDate: '2028-09-20' },
        }));

        expect(ok).toBe(true);
        // الجذر يُكتب sync؛ فهرس البطاقات يُحدَّث عبر setItemSync (يُجدول setItem async لنفس المفتاح فقط)
        expect(setItemSpy).toHaveBeenCalledTimes(1);
        expect(setItemSpy).toHaveBeenCalledWith(CRIMINAL_CARD_INDEX_KEY, expect.any(String));
        expect(eventSpy).toHaveBeenCalledTimes(1);

        const payload = JSON.parse(SecureStoreService.getItemSync(CRIMINAL_STORE_KEY) ?? '{}') as {
            state?: { casesById?: Record<string, { location?: { nextHearingDate?: string } }> };
        };
        expect(payload.state?.casesById?.c1?.location?.nextHearingDate).toBe('2028-09-20');
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
        expect(rows).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ id: 'stale', title: 'legacy-only' }),
                expect.objectContaining({ id: 'live', title: 'from-shard' }),
            ]),
        );
        expect(loadCriminalCaseRecordByIdSync('live')).toEqual(
            expect.objectContaining({ id: 'live', title: 'from-shard' }),
        );
    });
});
