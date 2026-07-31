import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useExecutionDashboardDossierAdminFollowupHandlers } from '../useExecutionDashboardDossierAdminFollowupHandlers';

const appendSpecialFollowupRequest = vi.fn(() => 'decision-1');
const isFollowupRequestKindAllowed = vi.fn(() => ({ allowed: true }));
const dispatchDomainIsolationBlocked = vi.fn();

vi.mock('@/app/utils/specialFollowupDecisionQueue', () => ({
    appendSpecialFollowupRequest,
}));

vi.mock('@/app/utils/executionDomainIsolation', () => ({
    isFollowupRequestKindAllowed,
    dispatchDomainIsolationBlocked,
}));

describe('useExecutionDashboardDossierAdminFollowupHandlers', () => {
    it('submits a manual special followup request and resets draft state', async () => {
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();
        const setSpecialRequestTemplatePick = vi.fn();
        const setSpecialRequestContent = vi.fn();
        const setSpecialRequestManualTitle = vi.fn();
        const setSpecialRequestDate = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardDossierAdminFollowupHandlers({
                executionData: { id: 'exec-1' } as never,
                decisionsStorageExecutionId: 'exec-1',
                specialRequestDate: '2026-07-11',
                specialRequestManualTitle: 'طلب خاص',
                specialRequestContent: 'تفاصيل الطلب',
                nextTimelineId: () => 'timeline-1',
                pushTimelineEvent,
                showToast,
                setSpecialRequestTemplatePick,
                setSpecialRequestContent,
                setSpecialRequestManualTitle,
                setSpecialRequestDate,
            }),
        );

        await result.current.runSpecialFollowupSubmit();

        expect(isFollowupRequestKindAllowed).toHaveBeenCalledWith(
            { id: 'exec-1' },
            'exec-1',
            'special_followup',
        );
        expect(appendSpecialFollowupRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-1',
                requestDate: '2026-07-11',
                decisionTitle: 'طلب خاص',
            }),
        );
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'timeline-1',
                date: '2026-07-11',
                title: 'طلب خاص — قيد البت',
            }),
        );
        expect(setSpecialRequestTemplatePick).toHaveBeenCalled();
        expect(setSpecialRequestContent).toHaveBeenCalledWith('');
        expect(setSpecialRequestManualTitle).toHaveBeenCalledWith('');
        expect(setSpecialRequestDate).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('تم حفظ الطلب بنجاح'),
            'success',
            expect.any(Object),
        );
        expect(dispatchDomainIsolationBlocked).not.toHaveBeenCalled();
    });
});
