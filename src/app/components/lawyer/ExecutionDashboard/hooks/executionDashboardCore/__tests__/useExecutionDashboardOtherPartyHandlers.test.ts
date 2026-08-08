import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardOtherPartyHandlers } from '../useExecutionDashboardOtherPartyHandlers';

const appendSpecialFollowupRequestMock = vi.fn();

vi.mock('@/app/utils/specialFollowupDecisionQueue', () => ({
    appendSpecialFollowupRequest: (...args: unknown[]) => appendSpecialFollowupRequestMock(...args),
}));

describe('useExecutionDashboardOtherPartyHandlers', () => {
    beforeEach(() => {
        appendSpecialFollowupRequestMock.mockReset();
    });

    const baseParams = () => ({
        executionDataRef: { current: { id: 'exec-1' } as ExecutionFile },
        executionData: { id: 'exec-1' } as ExecutionFile,
        executionId: 'exec-1',
        decisionsStorageExecutionId: 'exec-1',
        isRepresentingDebtor: true,
        timelineEvents: [],
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        pushTimelineEvent: vi.fn(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        openDecisionsModalWithBoot: vi.fn(),
        setTimelineEvents: vi.fn(),
    });

    it('logs other party action directly when representing debtor', () => {
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardOtherPartyHandlers({
                ...baseParams(),
                pushTimelineEvent,
                showToast,
                isRepresentingDebtor: true,
            }),
        );

        let output: { ok: boolean } | undefined;
        act(() => {
            output = result.current.otherPartyTabSubmitHandler({
                date: '2026-07-11',
                content: 'تقدّم بطلب جديد',
            }) as { ok: boolean };
        });

        expect(output).toEqual({ ok: true });
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'تحرك الطرف الآخر',
                description: 'تقدّم بطلب جديد',
                type: 'other_party',
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم تسجيل التحرك في السجل الزمني.', 'success');
    });

    it('submits other party action to decisions when representing creditor', () => {
        appendSpecialFollowupRequestMock.mockReturnValue('decision-1');

        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();
        const persistExecutionMerge = vi.fn(() => true);

        const { result } = renderHook(() =>
            useExecutionDashboardOtherPartyHandlers({
                ...baseParams(),
                pushTimelineEvent,
                persistExecutionMerge,
                showToast,
                isRepresentingDebtor: false,
            }),
        );

        let output: { ok: boolean; decisionId?: string; logEntryId?: string } | undefined;
        act(() => {
            output = result.current.otherPartyTabSubmitHandler({
                date: '2026-07-11',
                content: 'اعتراض جديد من الطرف الآخر',
            }) as { ok: boolean; decisionId?: string; logEntryId?: string };
        });

        expect(appendSpecialFollowupRequestMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-1',
                requestDate: '2026-07-11',
                decisionTitle: 'تحرك الطرف الآخر — قيد البت',
            }),
        );
        expect(output?.ok).toBe(true);
        expect(output?.decisionId).toBe('decision-1');
        expect(output?.logEntryId).toMatch(/^opa-/);
        expect(persistExecutionMerge).toHaveBeenCalled();
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'تحرك الطرف الآخر — قيد البت',
                type: 'decision',
                metadata: expect.objectContaining({
                    decisionRowId: 'decision-1',
                }),
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ التحرك في السجل.', 'success', undefined);
    });
});
