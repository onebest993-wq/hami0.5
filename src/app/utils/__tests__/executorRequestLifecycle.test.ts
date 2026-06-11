import { describe, expect, it } from 'vitest';
import { summarizeExecutorHubRequestLifecycle } from '@/app/utils/executorRequestLifecycle';

describe('summarizeExecutorHubRequestLifecycle', () => {
    it('counts submissions, approvals, rejections, and pending', () => {
        const rows = [
            {
                id: 'c',
                date: '2026-03-01',
                executorOutcome: 'pending',
            },
            {
                id: 'b',
                date: '2026-02-02',
                executorOutcome: 'rejected',
            },
            {
                id: 'a',
                date: '2026-01-10',
                title: 'طلب كسر الأقفال وجرد الأثاث',
                requestKind: 'eviction_procedure',
                executorOutcome: 'approved',
                breakInventoryFurnitureFinalizedAt: '2026-01-12',
                requestCycleSuperseded: true,
                requestCycleSupersededAt: '2026-02-01',
            },
        ];

        const summary = summarizeExecutorHubRequestLifecycle(rows as Record<string, unknown>[]);
        expect(summary).not.toBeNull();
        expect(summary!.submissions).toBe(3);
        expect(summary!.approvals).toBe(1);
        expect(summary!.rejections).toBe(1);
        expect(summary!.pending).toBe(1);
        expect(summary!.entries[0]?.decisionId).toBe('c');
        expect(summary!.entries[2]?.outcomeLabel).toBe('مكتمل');
    });
});
