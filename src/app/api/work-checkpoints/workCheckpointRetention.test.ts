import { describe, expect, it } from 'vitest';
import {
    idsToDropWorkCheckpoints,
    mergeWorkCheckpointReads,
    WORK_CHECKPOINT_KEEP_LATEST,
} from './workCheckpointRetention';

describe('workCheckpointRetention', () => {
    it('يبقي آخر 3 ويحذف الأقدم', () => {
        const drop = idsToDropWorkCheckpoints([
            { id: 'n1' },
            { id: 'n2' },
            { id: 'n3' },
            { id: 'n4' },
            { id: 'n5' },
        ]);
        expect(WORK_CHECKPOINT_KEEP_LATEST).toBe(3);
        expect(drop).toEqual(['n4', 'n5']);
    });

    it('لا يحذف أحدث keep_anchor ولو خرج عن نافذة الـ 3', () => {
        const drop = idsToDropWorkCheckpoints([
            { id: 's1', keep_anchor: false },
            { id: 's2', keep_anchor: false },
            { id: 's3', keep_anchor: false },
            { id: 's4', keep_anchor: false },
            { id: 's5', keep_anchor: false },
            { id: 'complete', keep_anchor: true },
        ]);
        expect(drop).toEqual(['s4', 's5']);
        expect(drop).not.toContain('complete');
    });

    it('يدمج صف الـ anchor الأقدم في القراءة مع الأحدث أولاً', () => {
        const merged = mergeWorkCheckpointReads(
            [
                {
                    id: 's1',
                    encrypted_data: 'new',
                    data_signature: 'a',
                    created_at: '2026-08-30T12:00:00.000Z',
                },
                {
                    id: 's2',
                    encrypted_data: 'mid',
                    data_signature: 'b',
                    created_at: '2026-08-30T11:00:00.000Z',
                },
            ],
            {
                id: 'complete',
                encrypted_data: 'full',
                data_signature: 'c',
                created_at: '2026-08-01T00:00:00.000Z',
            },
        );
        expect(merged.map((row) => row.id)).toEqual(['s1', 's2', 'complete']);
        expect(merged[0]?.encrypted_data).toBe('new');
    });
});
