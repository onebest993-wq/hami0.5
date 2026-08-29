import { describe, expect, it } from 'vitest';
import {
    CRIMINAL_CARD_INDEX_STUB_FLAG,
    isCriminalCaseCardIndexStub,
    markCriminalCaseCardIndexStub,
    projectCriminalCaseCardIndexEntry,
    shouldInjectCriminalCaseRecord,
} from '@/app/utils/criminalCaseCardIndex';
import { injectCriminalCaseIntoMap } from '@/app/utils/criminalCaseStoreInject';

describe('criminalCaseCardIndex stub / inject policy', () => {
    it('marks and detects card-index stubs', () => {
        const entry = projectCriminalCaseCardIndexEntry({
            id: 'c1',
            ownerLawyerId: 'law-1',
            basics: { stage: 'مرحلة التحقيق' },
        })!;
        expect(isCriminalCaseCardIndexStub(entry)).toBe(true);
        const marked = markCriminalCaseCardIndexStub({ ...entry });
        expect(marked[CRIMINAL_CARD_INDEX_STUB_FLAG]).toBe(true);
        expect(isCriminalCaseCardIndexStub(marked)).toBe(true);
        expect(
            isCriminalCaseCardIndexStub({
                id: 'c1',
                createdAt: '2026-01-01T00:00:00.000Z',
                ownerLawyerId: 'law-1',
            }),
        ).toBe(false);
    });

    it('never replaces full case with stub; upgrades stub to full', () => {
        expect(shouldInjectCriminalCaseRecord({ id: 'c1', createdAt: 't' }, true)).toBe('skip');
        expect(shouldInjectCriminalCaseRecord({ id: 'c1', createdAt: 't' }, false)).toBe('skip');
        expect(
            shouldInjectCriminalCaseRecord(
                markCriminalCaseCardIndexStub({ id: 'c1' }),
                false,
            ),
        ).toBe('inject');
        expect(shouldInjectCriminalCaseRecord(null, true)).toBe('inject');
    });

    it('injectCriminalCaseIntoMap refuses stub overwrite of full shard row', () => {
        const full = {
            id: 'c1',
            createdAt: '2026-01-01T00:00:00.000Z',
            ownerLawyerId: 'law-1',
            lawyerRequests: [{ id: 'r1' }],
        };
        const stub = projectCriminalCaseCardIndexEntry({
            id: 'c1',
            ownerLawyerId: 'law-1',
            basics: { stage: 'مرحلة التحقيق' },
        })!;

        const blocked = injectCriminalCaseIntoMap({ c1: full }, 'c1', stub, {
            fromCardIndex: true,
        });
        expect(blocked.injected).toBe(false);
        expect(blocked.next.c1).toEqual(full);

        const seeded = injectCriminalCaseIntoMap({}, 'c1', stub, { fromCardIndex: true });
        expect(seeded.injected).toBe(true);
        expect(isCriminalCaseCardIndexStub(seeded.next.c1)).toBe(true);

        const upgraded = injectCriminalCaseIntoMap(seeded.next, 'c1', full, {
            fromCardIndex: false,
        });
        expect(upgraded.injected).toBe(true);
        expect(isCriminalCaseCardIndexStub(upgraded.next.c1)).toBe(false);
        expect((upgraded.next.c1 as { lawyerRequests?: unknown[] }).lawyerRequests).toHaveLength(1);
    });
});
