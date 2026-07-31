import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardOtherPartyCreditorHandlers } from '../useExecutionDashboardOtherPartyCreditorHandlers';

const appendSpecialFollowupRequestMock = vi.fn();
const submitCreditorOtherPartyTrackToDecisionsMock = vi.fn();
const resolveCreditorOtherPartyTrackDecisionMock = vi.fn();

vi.mock('@/app/utils/specialFollowupDecisionQueue', () => ({
    appendSpecialFollowupRequest: (...args: unknown[]) => appendSpecialFollowupRequestMock(...args),
}));

vi.mock('@/app/utils/otherPartyCreditorTrackDecisionUtils', () => ({
    submitCreditorOtherPartyTrackToDecisions: (...args: unknown[]) =>
        submitCreditorOtherPartyTrackToDecisionsMock(...args),
    resolveCreditorOtherPartyTrackDecision: (...args: unknown[]) =>
        resolveCreditorOtherPartyTrackDecisionMock(...args),
}));

describe('useExecutionDashboardOtherPartyCreditorHandlers', () => {
    beforeEach(() => {
        appendSpecialFollowupRequestMock.mockReset();
        submitCreditorOtherPartyTrackToDecisionsMock.mockReset();
        resolveCreditorOtherPartyTrackDecisionMock.mockReset();
    });

    const baseParams = () => ({
        executionDataRef: { current: { id: 'exec-1' } as ExecutionFile },
        executionId: 'exec-1',
        decisionsStorageExecutionId: 'exec-1',
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        pushTimelineEvent: vi.fn(),
        showToast: vi.fn(),
        openDecisionsModalWithBoot: vi.fn(),
    });

    it('submits other party tab action to decisions', () => {
        appendSpecialFollowupRequestMock.mockReturnValue('decision-1');
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardOtherPartyCreditorHandlers({
                ...baseParams(),
                pushTimelineEvent,
                showToast,
            }),
        );

        let output: { ok: boolean; decisionId?: string } | undefined;
        act(() => {
            output = result.current.otherPartyTabSubmitHandler({
                date: '2026-07-11',
                content: 'مذكرة من الطرف الآخر',
            });
        });

        expect(output).toEqual({ ok: true, decisionId: 'decision-1' });
        expect(appendSpecialFollowupRequestMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-1',
                requestDate: '2026-07-11',
                decisionTitle: 'تحرك الطرف الآخر — قيد البت',
            }),
        );
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'تحرك الطرف الآخر — قيد البت',
                metadata: expect.objectContaining({
                    decisionRowId: 'decision-1',
                }),
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم حفظ التحرك في السجل.', 'success');
    });

    it('submits creditor request card and opens decision modal', () => {
        submitCreditorOtherPartyTrackToDecisionsMock.mockReturnValue({
            ok: true,
            decisionId: 'decision-2',
        });
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();
        const openDecisionsModalWithBoot = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardOtherPartyCreditorHandlers({
                ...baseParams(),
                pushTimelineEvent,
                showToast,
                openDecisionsModalWithBoot,
            }),
        );

        let output: { ok: boolean; decisionId?: string } | undefined;
        act(() => {
            output = result.current.creditorOtherPartyTrackHandlers.onSubmitCreditorRequest({
                optionId: 'track-1',
                label: 'اعتراض',
                date: '2026-07-11',
            });
        });

        expect(output).toEqual({ ok: true, decisionId: 'decision-2' });
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'اعتراض — قيد البت',
                metadata: expect.objectContaining({
                    otherPartyTrackOptionId: 'track-1',
                    decisionRowId: 'decision-2',
                }),
            }),
        );
        expect(showToast).toHaveBeenCalledWith(
            'تم إنشاء بطاقة في القرارات والطعون.',
            'success',
            { decisionsLink: true },
        );

        act(() => {
            result.current.creditorOtherPartyTrackHandlers.onOpenDecision('decision-2');
        });

        expect(openDecisionsModalWithBoot).toHaveBeenCalledWith({
            tab: 'current',
            decisionId: 'decision-2',
        });
    });
});
