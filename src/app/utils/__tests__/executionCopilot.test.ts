import { describe, expect, it } from 'vitest';
import {
    buildExecutionCaseSnapshot,
    shouldAutoRunCopilot,
    snapshotFingerprint,
} from '@/app/utils/executionCopilot';

describe('executionCopilot helpers', () => {
    it('builds a bounded snapshot', () => {
        const snapshot = buildExecutionCaseSnapshot({
            executionData: {
                id: 'ex-1',
                status: 'active',
                claimType: 'تخلية',
                creditors: [{ id: 'c1' }],
                debtors: [{ id: 'd1' }],
            } as any,
            timelineEvents: Array.from({ length: 80 }).map((_, i) => ({
                id: `t-${i}`,
                type: 'other',
                title: `event-${i}`,
                date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
                timestamp: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
            })),
            caseNotesLog: [{ id: 'n1', title: 'note', createdAt: '2026-01-01' }],
            caseTasksPending: [{ id: 'k1', title: 'task', dueDate: '2026-01-10' }],
        });

        expect(snapshot).not.toBeNull();
        expect(snapshot?.timeline.length).toBe(50);
        expect(snapshot?.quickFacts.pendingTasksCount).toBe(1);
    });

    it('generates a stable fingerprint', () => {
        const snapshot = buildExecutionCaseSnapshot({
            executionData: { id: 'ex-2', status: 'active', claimType: 'مالي', creditors: [], debtors: [] } as any,
            timelineEvents: [{ id: '1', type: 'other', title: 'a', date: '2026-01-01', timestamp: '2026-01-01' }] as any,
        });
        const a = snapshotFingerprint(snapshot);
        const b = snapshotFingerprint(snapshot);
        expect(a).toBe(b);
    });

    it('decides auto-run conditions correctly', () => {
        expect(
            shouldAutoRunCopilot({
                enabled: true,
                fingerprint: '123',
                lastFingerprint: '122',
                lastRunAt: Date.now() - 16000,
                cooldownMs: 15000,
            })
        ).toBe(true);
        expect(
            shouldAutoRunCopilot({
                enabled: false,
                fingerprint: '123',
                lastFingerprint: '122',
            })
        ).toBe(false);
    });
});
