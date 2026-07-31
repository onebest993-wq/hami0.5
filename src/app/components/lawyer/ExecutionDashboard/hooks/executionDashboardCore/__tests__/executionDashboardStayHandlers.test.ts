import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useExecutionDashboardStayHandlers } from '../useExecutionDashboardStayHandlers';

describe('useExecutionDashboardStayHandlers', () => {
    it('composes lifecycle and apply handlers into one typed surface', () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setTimelineEvents = vi.fn((updater: unknown) =>
            typeof updater === 'function' ? (updater as (prev: unknown[]) => unknown[])([]) : updater,
        );
        const setCaseTasksPending = vi.fn((updater: unknown) =>
            typeof updater === 'function' ? (updater as (prev: unknown[]) => unknown[])([]) : updater,
        );
        const setExecutionPaused = vi.fn();

        const input = {
            executionData: { id: 'exec-1' },
            file: { id: 'file-1' },
            currentFileId: 'exec-1',
            nextTimelineId: vi.fn(() => 'tl-1'),
            persistExecutionMerge,
            showToast,
            setTimelineEvents,
            setCaseTasksPending,
            setExecutionPaused,
        };

        const { result } = renderHook(() => useExecutionDashboardStayHandlers(input as never));

        expect(result.current.handleLiftStayOfExecution).toEqual(expect.any(Function));
        expect(result.current.handleSpecialCasesStay).toEqual(expect.any(Function));
        expect(result.current.handleResumeExecution).toEqual(expect.any(Function));

        result.current.handleLiftStayOfExecution();
        expect(showToast).toHaveBeenCalledWith('تم رفع الاستئخار', 'success');

        const accepted = result.current.handleSpecialCasesStay({
            decision_number: '12',
            court_name: 'محكمة',
            next_hearing_date: '2026-08-01',
        });
        expect(accepted).toBe(true);
        expect(showToast).toHaveBeenCalledWith('تم تفعيل الاستئخار وتسجيل المهمة.', 'success');
    });

    /**
     * كان `handleResumeExecution` يُعلن «تم استئناف التنفيذ» ولا يُثبّت شيئاً:
     * تُعاد `executionPaused` من البلوب عند الفتح فتقفل الأدوات الجبرية مجدداً.
     */
    it('persists the resume instead of only announcing it', async () => {
        const persistExecutionMerge = vi.fn();
        const showToast = vi.fn();
        const setTimelineEvents = vi.fn((updater: unknown) =>
            typeof updater === 'function' ? (updater as (prev: unknown[]) => unknown[])([]) : updater,
        );
        const setExecutionPaused = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardStayHandlers({
                executionData: { id: 'exec-1' },
                file: { id: 'file-1' },
                currentFileId: 'exec-1',
                nextTimelineId: vi.fn(() => 'tl-resume'),
                persistExecutionMerge,
                showToast,
                setTimelineEvents,
                setCaseTasksPending: vi.fn(),
                setExecutionPaused,
            } as never),
        );

        result.current.handleResumeExecution();

        expect(setExecutionPaused).toHaveBeenCalledWith(false);
        await Promise.resolve();

        expect(persistExecutionMerge).toHaveBeenCalledTimes(1);
        const patch = persistExecutionMerge.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(patch.executionPaused).toBe(false);
        expect(Array.isArray(patch.timelineEvents)).toBe(true);
        expect((patch.timelineEvents as Array<{ id?: string }>)[0]?.id).toBe('tl-resume');
    });
});
