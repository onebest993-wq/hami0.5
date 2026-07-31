import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardOtherPartyDebtorHandlers } from '../useExecutionDashboardOtherPartyDebtorHandlers';

describe('useExecutionDashboardOtherPartyDebtorHandlers', () => {
    const baseParams = () => ({
        executionData: { id: 'exec-1' } as ExecutionFile,
        timelineEvents: [],
        nextTimelineId: (() => {
            let n = 0;
            return () => `tl-${++n}`;
        })(),
        pushTimelineEvent: vi.fn(),
        persistExecutionMerge: vi.fn(),
        showToast: vi.fn(),
        setTimelineEvents: vi.fn(),
    });

    it('logs other party action into timeline', () => {
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardOtherPartyDebtorHandlers({
                ...baseParams(),
                pushTimelineEvent,
                showToast,
            }),
        );

        let output: { ok: boolean } | undefined;
        act(() => {
            output = result.current.otherPartyTabSubmitHandler({
                date: '2026-07-11',
                content: 'طلب مقدم من الطرف الآخر',
            }) as { ok: boolean };
        });

        expect(output).toEqual({ ok: true });
        expect(pushTimelineEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'تحرك الطرف الآخر',
                description: 'طلب مقدم من الطرف الآخر',
                type: 'other_party',
            }),
        );
        expect(showToast).toHaveBeenCalledWith('تم تسجيل التحرك في السجل الزمني.', 'success');
    });

    it('migrates legacy other party log entries into timeline once', () => {
        const persistExecutionMerge = vi.fn();
        const setTimelineEvents = vi.fn();
        const showToast = vi.fn();

        renderHook(() =>
            useExecutionDashboardOtherPartyDebtorHandlers({
                ...baseParams(),
                executionData: {
                    id: 'exec-1',
                    other_party_actions_log: [
                        {
                            id: 'log-1',
                            date: '2026-07-10',
                            content: 'اعتراض',
                            savedAt: '2026-07-10T12:00:00.000Z',
                        },
                    ],
                } as ExecutionFile,
                persistExecutionMerge,
                setTimelineEvents,
                showToast,
            }),
        );

        expect(persistExecutionMerge).toHaveBeenCalledWith(
            expect.objectContaining({
                timelineEvents: expect.arrayContaining([
                    expect.objectContaining({
                        title: 'اعتراض',
                        type: 'other_party',
                    }),
                ]),
                other_party_actions_log: [],
            }),
        );
        expect(setTimelineEvents).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    title: 'اعتراض',
                    type: 'other_party',
                }),
            ]),
        );
        expect(showToast).toHaveBeenCalledWith(
            'نُقل 1 سجل إلى السجل الزمني (تبويب تحركات الطرف الآخر).',
            'info',
        );
    });
});
