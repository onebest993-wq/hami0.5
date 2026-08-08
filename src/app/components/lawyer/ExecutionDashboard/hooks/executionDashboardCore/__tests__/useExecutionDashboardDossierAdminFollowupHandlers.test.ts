import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    appendSpecialFollowupRequest: vi.fn(() => 'decision-1'),
}));

vi.mock('@/app/utils/specialFollowupDecisionQueue', () => ({
    appendSpecialFollowupRequest: mocks.appendSpecialFollowupRequest,
}));

import { useExecutionDashboardDossierAdminFollowupHandlers } from '../useExecutionDashboardDossierAdminFollowupHandlers';

const { appendSpecialFollowupRequest } = mocks;

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

        expect(appendSpecialFollowupRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-1',
                requestDate: '2026-07-11',
                decisionTitle: 'طلب خاص',
                adminRequestsTab: true,
                executionData: { id: 'exec-1' },
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
            expect.stringContaining('تم إرسال الطلب'),
            'success',
            expect.any(Object),
        );
    });

    it('resolves execution id from executionData when decisionsStorageExecutionId is empty', async () => {
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardDossierAdminFollowupHandlers({
                executionData: { id: 'exec-from-data' } as never,
                decisionsStorageExecutionId: undefined,
                specialRequestDate: '2026-07-11',
                specialRequestManualTitle: 'طلب',
                specialRequestContent: 'تفاصيل',
                nextTimelineId: () => 'timeline-2',
                pushTimelineEvent,
                showToast,
                setSpecialRequestTemplatePick: vi.fn(),
                setSpecialRequestContent: vi.fn(),
                setSpecialRequestManualTitle: vi.fn(),
                setSpecialRequestDate: vi.fn(),
            }),
        );

        await result.current.runSpecialFollowupSubmit();

        expect(appendSpecialFollowupRequest).toHaveBeenCalledWith(
            expect.objectContaining({ executionId: 'exec-from-data', adminRequestsTab: true }),
        );
    });
});
