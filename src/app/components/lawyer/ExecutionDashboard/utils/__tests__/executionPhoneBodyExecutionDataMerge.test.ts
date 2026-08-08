import { describe, expect, it } from 'vitest';
import { mergeExecutionFileSeizureLists, mergeSeizedMovableLists } from '../executionPhoneBodyExecutionDataMerge';

describe('mergeExecutionFileSeizureLists', () => {
    it('preserves local mark fields when scope row is stale', () => {
        const fromScope = {
            id: 'ex-1',
            seizedMovables: [
                {
                    id: 'sm_d1',
                    movableDescription: 'سيارة',
                    status: 'seized',
                },
            ],
        } as never;
        const local = {
            id: 'ex-1',
            seizedMovables: [
                {
                    id: 'sm_d1',
                    movableDescription: 'سيارة',
                    status: 'seized',
                    seizureMarkLetterNumber: '123',
                    seizureMarkDate: '2026-08-04',
                    seizureMarkEntity: 'مديرية',
                },
            ],
        } as never;
        const merged = mergeExecutionFileSeizureLists(fromScope, local);
        expect(merged?.seizedMovables?.[0]?.seizureMarkLetterNumber).toBe('123');
    });

    it('preserves local publication when scope lacks newspaper fields', () => {
        const fromScope = {
            id: 'ex-1',
            seizedMovables: [
                {
                    id: 'sm_d1',
                    seizureMarkLetterNumber: '123',
                    status: 'seized',
                },
            ],
        } as never;
        const local = {
            id: 'ex-1',
            seizedMovables: [
                {
                    id: 'sm_d1',
                    seizureMarkLetterNumber: '123',
                    newspaperName: 'الوقائع',
                    publicationDateYmd: '2026-08-05',
                    status: 'published',
                },
            ],
        } as never;
        const merged = mergeExecutionFileSeizureLists(fromScope, local);
        expect(merged?.seizedMovables?.[0]?.newspaperName).toBe('الوقائع');
        expect(merged?.seizedMovables?.[0]?.status).toBe('published');
    });

    it('mergeSeizedMovableLists prefers richer row when ids match', () => {
        const stale = [
            {
                id: 'sm_d1',
                movableDescription: 'سيارة',
                status: 'seized',
            },
        ] as never;
        const fresh = [
            {
                id: 'sm_d1',
                movableDescription: 'سيارة',
                status: 'seized',
                seizureMarkLetterNumber: '456',
                seizureMarkDate: '2026-08-05',
            },
        ] as never;
        const merged = mergeSeizedMovableLists(stale, fresh);
        expect(merged[0]?.seizureMarkLetterNumber).toBe('456');
    });
});
