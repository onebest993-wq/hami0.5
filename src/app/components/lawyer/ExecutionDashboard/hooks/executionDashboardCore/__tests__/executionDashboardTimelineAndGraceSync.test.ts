import { describe, expect, it } from 'vitest';
import type { TimelineEvent } from '@/app/types/execution';
import {
    buildTimelineEventRowSignature,
    planTimelineDedupePersist,
    reconcileCaseNotesLogState,
    reconcileTimelineEventsState,
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

    it('reconcile keeps local events when incoming is empty', () => {
        const local = [{ id: '1', type: 'other', title: 'a', date: '2026-01-01' }] as TimelineEvent[];
        expect(reconcileTimelineEventsState(local, [], { forceReplace: false })).toEqual(local);
    });

    it('reconcile force-replaces on dossier context switch', () => {
        const local = [{ id: '1', type: 'other', title: 'a', date: '2026-01-01' }] as TimelineEvent[];
        const incoming = [{ id: '2', type: 'other', title: 'b', date: '2026-01-02' }] as TimelineEvent[];
        expect(reconcileTimelineEventsState(local, incoming, { forceReplace: true })).toEqual(incoming);
    });

    it('reconcile merges new incoming events without dropping local-only rows', () => {
        const local = [{ id: '1', type: 'other', title: 'a', date: '2026-01-01' }] as TimelineEvent[];
        const incoming = [
            { id: '1', type: 'other', title: 'a', date: '2026-01-01' },
            { id: '2', type: 'other', title: 'b', date: '2026-01-02' },
        ] as TimelineEvent[];
        const merged = reconcileTimelineEventsState(local, incoming);
        expect(merged.map((e) => e.id)).toEqual(['1', '2']);
    });

    it('reconcileCaseNotesLog keeps local notes when incoming is empty', () => {
        const local = [{ id: 'n1', title: 'ملاحظة', body: 'تفاصيل', createdAt: '2026-01-01' }];
        expect(reconcileCaseNotesLogState(local, [], { forceReplace: false })).toEqual(local);
    });

    it('reconcileCaseNotesLog force-replaces on dossier context switch', () => {
        const local = [{ id: 'n1', title: 'قديم', body: 'x', createdAt: '2026-01-01' }];
        const incoming = [{ id: 'n2', title: 'جديد', body: 'y', createdAt: '2026-01-02' }];
        expect(reconcileCaseNotesLogState(local, incoming, { forceReplace: true })).toEqual(incoming);
    });
});
