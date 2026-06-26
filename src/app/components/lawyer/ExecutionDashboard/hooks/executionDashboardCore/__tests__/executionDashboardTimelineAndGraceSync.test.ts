import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import {
    buildTimelineEventRowSignature,
    planTimelineDedupePersist,
    shouldEndGracePeriodFromExecutionStatus,
    shouldShowEvictionGraceReminderToast,
} from '../executionDashboardTimelineAndGraceSync';

describe('executionDashboardTimelineAndGraceSync', () => {
    it('builds stable timeline signatures', () => {
        const events = [{ id: '1', type: 'other', title: 't', date: '2026-01-01' }] as TimelineEvent[];
        expect(buildTimelineEventRowSignature(events)).toContain('1:other:t');
    });

    it('plans dedupe persist when signature changes', () => {
        const plan = planTimelineDedupePersist({
            timelineEvents: [
                { id: '1', type: 'other', title: 'a', date: '2026-01-01' },
                { id: '1', type: 'other', title: 'a', date: '2026-01-01' },
            ] as TimelineEvent[],
            executionId: 'ex1',
            activeSubFileId: null,
            parentDossierId: '',
            previousSignature: '',
        });
        expect(plan?.cleaned.length).toBe(1);
    });

    it('ends grace when execution status is coercive-ready', () => {
        expect(shouldEndGracePeriodFromExecutionStatus('READY_FOR_COERCIVE', false)).toBe(true);
        expect(shouldEndGracePeriodFromExecutionStatus('READY_FOR_COERCIVE', true)).toBe(false);
    });

    it('gates eviction grace reminder toast', () => {
        expect(shouldShowEvictionGraceReminderToast({ remainingDays: 2 })).toBe(true);
        expect(shouldShowEvictionGraceReminderToast({ remainingDays: 5 })).toBe(false);
    });
});
