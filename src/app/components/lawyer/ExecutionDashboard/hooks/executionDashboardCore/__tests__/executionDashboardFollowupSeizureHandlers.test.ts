import { describe, expect, it, vi } from 'vitest';
import {
    runSaveSeizedMovableInitForDecision,
    runSaveSeizedPropertyInitForDecision,
} from '../executionDashboardFollowupSeizureInits';
import {
    runSubmitMovableSeizureRequest,
    runSubmitPropertySeizureRequest,
} from '../executionDashboardSeizureRequestSubmit';

describe('executionDashboardFollowupSeizureInits', () => {
    it('property init is a pure no-op (no entity create)', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();

        runSaveSeizedPropertyInitForDecision(
            {
                decisionId: 'd1',
                propertyNumber: '123',
                propertyGender: 'male',
                deedNotes: 'notes',
            },
            {
                exId: 'ex-1',
                executionDataRef: { current: { seizedProperties: [] } } as never,
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge,
                pushTimelineEvent,
                showToast,
            },
        );

        expect(persistExecutionMerge).not.toHaveBeenCalled();
        expect(pushTimelineEvent).not.toHaveBeenCalled();
        expect(showToast).not.toHaveBeenCalled();
    });

    it('movable init is a pure no-op and returns null', () => {
        const persistExecutionMerge = vi.fn(() => true);
        const result = runSaveSeizedMovableInitForDecision(
            {
                decisionId: 'd1',
                movableDescription: 'سيارة',
                movableLocation: 'بغداد',
                judicialCustodianName: 'حارس',
            },
            {
                exId: 'ex-1',
                executionDataRef: { current: { seizedMovables: [] } } as never,
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge,
                pushTimelineEvent: vi.fn(),
                showToast: vi.fn(),
            },
        );
        expect(result).toBeNull();
        expect(persistExecutionMerge).not.toHaveBeenCalled();
    });
});

describe('executionDashboardSeizureRequestSubmit', () => {
    it('no-ops when execution id missing', () => {
        const onSubmitted = vi.fn();
        runSubmitPropertySeizureRequest(
            { subjectDraft: 'عقار', onSubmitted },
            {
                exId: '',
                nextTimelineId: () => 'tl-1',
                pushTimelineEvent: vi.fn(),
                showToast: vi.fn(),
            },
        );
        expect(onSubmitted).not.toHaveBeenCalled();
    });

    it('exposes movable submit helper', () => {
        expect(typeof runSubmitMovableSeizureRequest).toBe('function');
    });
});
