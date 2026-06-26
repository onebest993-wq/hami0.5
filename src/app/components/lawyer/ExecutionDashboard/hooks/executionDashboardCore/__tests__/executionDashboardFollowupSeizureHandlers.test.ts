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
    it('saves seized property init and patches decision row', () => {
        const persistExecutionMerge = vi.fn();
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();
        const executionDataRef = {
            current: { seizedProperties: [] },
        };

        runSaveSeizedPropertyInitForDecision(
            {
                decisionId: 'd1',
                propertyNumber: '123',
                propertyGender: 'male',
                deedNotes: 'notes',
            },
            {
                exId: 'ex-1',
                executionDataRef: executionDataRef as never,
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge,
                pushTimelineEvent,
                showToast,
            },
        );

        expect(persistExecutionMerge).toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            'تم حفظ بيانات العقار وإنشاء البطاقة داخل الأموال المحجوزة.',
            'success',
        );
    });

    it('validates movable init required fields', () => {
        const showToast = vi.fn();
        runSaveSeizedMovableInitForDecision(
            {
                decisionId: 'd1',
                movableDescription: '',
                movableLocation: 'baghdad',
                judicialCustodianName: 'cust',
            },
            {
                exId: 'ex-1',
                executionDataRef: { current: { seizedMovables: [] } } as never,
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge: vi.fn(),
                pushTimelineEvent: vi.fn(),
                showToast,
            },
        );
        expect(showToast).toHaveBeenCalledWith('أدخل وصف المال المنقول.', 'warning');
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
});
