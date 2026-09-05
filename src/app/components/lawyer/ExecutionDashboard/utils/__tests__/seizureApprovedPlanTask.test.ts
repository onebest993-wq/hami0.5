import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    buildSeizureApprovedPlanTask,
    findTaskLinkedToSeizureDecision,
    isSeizureDecisionApprovedForPlanBadge,
    SEIZURE_PLAN_DECISION_MARKER,
    seizurePlanMarker,
    seizureRequestTitleForSubtype,
} from '../seizureApprovedPlanTask';

describe('seizureApprovedPlanTask', () => {
    beforeEach(() => {
        let n = 0;
        vi.stubGlobal('crypto', {
            randomUUID: () => `task-fixed-${++n}`,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('builds a plan task marked with the seizure decision id', () => {
        const task = buildSeizureApprovedPlanTask({
            executionId: 'ex-1',
            decisionId: 'dec-9',
            subtype: 'property',
            requestTitle: 'طلب حجز عقار',
        });
        expect(task.linkedCaseId).toBe('ex-1');
        expect(task.title).toBe('خطة — طلب حجز عقار');
        expect(task.rawText).toContain(seizurePlanMarker('dec-9'));
        expect(task.rawText).toContain(SEIZURE_PLAN_DECISION_MARKER);
        expect(task.subTasks).toHaveLength(1);
        expect(task.subTasks[0]?.kind).toBe('branch');
        expect(task.subTasks[0]?.planStatus).toBe('pending');
    });

    it('finds a linked task by decision marker', () => {
        const task = buildSeizureApprovedPlanTask({
            executionId: 'ex-1',
            decisionId: 'dec-9',
            subtype: 'salary',
            requestTitle: 'طلب حجز راتب',
        });
        expect(findTaskLinkedToSeizureDecision([task], 'dec-9')?.id).toBe(task.id);
        expect(findTaskLinkedToSeizureDecision([task], 'other')).toBeNull();
    });

    it('only shows the plan badge for effectively approved rows', () => {
        expect(isSeizureDecisionApprovedForPlanBadge(null)).toBe(false);
        expect(isSeizureDecisionApprovedForPlanBadge({ id: 'd1', executorOutcome: 'pending' })).toBe(
            false,
        );
        expect(
            isSeizureDecisionApprovedForPlanBadge({ id: 'd1', executorOutcome: 'approved' }),
        ).toBe(true);
    });

    it('maps subtype titles', () => {
        expect(seizureRequestTitleForSubtype('property')).toBe('طلب حجز عقار');
        expect(seizureRequestTitleForSubtype('movable_auction')).toBe('طلب حجز مال منقول');
        expect(seizureRequestTitleForSubtype('salary', 'طلب حجز الحوافز')).toBe('طلب حجز الحوافز');
    });
});
