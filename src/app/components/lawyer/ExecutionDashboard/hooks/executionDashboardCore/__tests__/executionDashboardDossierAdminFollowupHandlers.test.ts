import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardDossierAdminFollowupHandlers } from '../useExecutionDashboardDossierAdminFollowupHandlers';

vi.mock('@/app/utils/specialFollowupDecisionQueue', () => ({
    appendSpecialFollowupRequest: vi.fn(() => 'dec-admin-1'),
}));

vi.mock('@/app/utils/executionDomainIsolation', () => ({
    isFollowupRequestKindAllowed: vi.fn(() => ({ allowed: true })),
    dispatchDomainIsolationBlocked: vi.fn(),
}));

describe('useExecutionDashboardDossierAdminFollowupHandlers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    /**
     * حارس انحدار: عقود العناقيد تتجاهل هوية الدوال — النسخة الأولى يجب أن
     * تقرأ حقول النموذج الحديثة عبر liveRef.
     */
    it('stale first-render handler still submits freshly typed form values', async () => {
        const showToast = vi.fn();
        const pushTimelineEvent = vi.fn();
        const setSpecialRequestContent = vi.fn();
        const setSpecialRequestManualTitle = vi.fn();
        const setSpecialRequestDate = vi.fn();
        const setSpecialRequestTemplatePick = vi.fn();
        const { appendSpecialFollowupRequest } = await import('@/app/utils/specialFollowupDecisionQueue');

        const { result, rerender } = renderHook(
            (props: Parameters<typeof useExecutionDashboardDossierAdminFollowupHandlers>[0]) =>
                useExecutionDashboardDossierAdminFollowupHandlers(props),
            {
                initialProps: {
                    executionData: { id: 'exec-1' } as any,
                    decisionsStorageExecutionId: 'dossier-1',
                    specialRequestDate: '',
                    specialRequestManualTitle: '',
                    specialRequestContent: '',
                    nextTimelineId: () => 'tl-1',
                    pushTimelineEvent,
                    showToast,
                    setSpecialRequestTemplatePick,
                    setSpecialRequestContent,
                    setSpecialRequestManualTitle,
                    setSpecialRequestDate,
                },
            },
        );

        const staleSubmit = result.current.runSpecialFollowupSubmit;

        rerender({
            executionData: { id: 'exec-1' } as any,
            decisionsStorageExecutionId: 'dossier-1',
            specialRequestDate: '2026-07-20',
            specialRequestManualTitle: 'طلب إداري',
            specialRequestContent: 'تفاصيل الطلب',
            nextTimelineId: () => 'tl-1',
            pushTimelineEvent,
            showToast,
            setSpecialRequestTemplatePick,
            setSpecialRequestContent,
            setSpecialRequestManualTitle,
            setSpecialRequestDate,
        });

        await act(async () => {
            await staleSubmit();
        });

        expect(appendSpecialFollowupRequest).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'dossier-1',
                requestDate: '2026-07-20',
                decisionTitle: 'طلب إداري',
                content: 'تفاصيل الطلب',
            }),
        );
        expect(showToast).toHaveBeenCalledWith(
            expect.stringContaining('تم إرسال الطلب إلى مركز القرارات'),
            'success',
            expect.objectContaining({ decisionsLink: true }),
        );
    });
});
