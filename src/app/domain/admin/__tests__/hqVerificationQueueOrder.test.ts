import { describe, expect, it } from 'vitest';
import { sortHqVerificationQueueRows } from '../hqVerificationQueueOrder';

describe('sortHqVerificationQueueRows', () => {
    it('يضع المعلّق الأقدم أولاً ثم المعتمد الأحدث', () => {
        const rows = sortHqVerificationQueueRows([
            { status: 'active', submittedAt: '2026-08-01T00:00:00.000Z' },
            { status: 'pending', submittedAt: '2026-08-20T00:00:00.000Z' },
            { status: 'pending', submittedAt: '2026-08-10T00:00:00.000Z' },
            { status: 'rejected', submittedAt: '2026-08-28T00:00:00.000Z' },
        ]);
        expect(rows.map((row) => `${row.status}:${row.submittedAt.slice(8, 10)}`)).toEqual([
            'pending:10',
            'pending:20',
            'rejected:28',
            'active:01',
        ]);
    });
});
