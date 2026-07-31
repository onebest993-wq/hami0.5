import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { Dispatch, SetStateAction } from 'react';
import { useExecutionDashboardPublicationNoticeHandlers } from '../useExecutionDashboardPublicationNoticeHandlers';

describe('useExecutionDashboardPublicationNoticeHandlers', () => {
    const baseExecutionData = {
        id: 'exec-1',
        publication_notice_by_debtor: {},
    } as ExecutionFile;

    it('warns when execution grid is locked', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPublicationNoticeHandlers({
                executionActionsGridLocked: true,
                executionData: baseExecutionData,
                unifiedSummonsTargetDebtorKey: 'debtor-1',
                primaryDebtorKeyResolved: 'debtor-1',
                nextTimelineId: vi.fn(() => 'tl-1'),
                persistExecutionMerge: vi.fn(),
                showToast,
                setTimelineEvents: vi.fn(),
            }),
        );

        act(() => {
            result.current.handlePublicationNoticeRegister({
                publicationDateYmd: '2026-07-11',
                newspaper1: 'الصباح',
                newspaper2: 'العدالة',
            });
        });

        expect(showToast).toHaveBeenCalledWith(
            '⚠️ الإضبارة مستأخرة — ارفع الاستئخار من الشريط التنبيهي أعلى الصفحة عند انقضاء السبب.',
            'warning',
        );
    });

    it('registers publication notice and persists timeline merge', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn(
            (updater: SetStateAction<TimelineEvent[]>) =>
                typeof updater === 'function' ? updater([]) : updater,
        ) as Dispatch<SetStateAction<TimelineEvent[]>>;
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardPublicationNoticeHandlers({
                executionActionsGridLocked: false,
                executionData: baseExecutionData,
                unifiedSummonsTargetDebtorKey: 'debtor-1',
                primaryDebtorKeyResolved: 'debtor-1',
                nextTimelineId: vi.fn(() => 'tl-1'),
                persistExecutionMerge,
                showToast,
                setTimelineEvents,
            }),
        );

        act(() => {
            result.current.handlePublicationNoticeRegister({
                publicationDateYmd: '2026-07-11',
                newspaper1: 'الصباح',
                newspaper2: 'العدالة',
            });
        });

        expect(persistExecutionMerge).toHaveBeenCalledTimes(2);
        expect(persistExecutionMerge).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
                publication_notice_by_debtor: expect.objectContaining({
                    'debtor-1': expect.objectContaining({
                        publicationDateYmd: '2026-07-11',
                        newspaper1: 'الصباح',
                        newspaper2: 'العدالة',
                    }),
                }),
            }),
        );
        expect(persistExecutionMerge).toHaveBeenNthCalledWith(
            2,
            expect.objectContaining({
                timelineEvents: expect.any(Array),
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم تسجيل التبليغ بالنشر', 'success');
    });
});
