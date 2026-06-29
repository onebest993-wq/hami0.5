import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardGracePeriodEndHandler } from '../useExecutionDashboardGracePeriodEndHandler';

describe('useExecutionDashboardGracePeriodEndHandler', () => {
    it('handleEndGracePeriod pushes grace ended event and toast', () => {
        const pushTimelineEvent = vi.fn();
        const showToast = vi.fn();
        const setGracePeriodActive = vi.fn();
        const setGracePeriodEnded = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardGracePeriodEndHandler({
                debtorNotificationDate: '2026-01-01',
                executionFeeInjected: false,
                calculatedExecutionFee: 50_000,
                pushTimelineEvent,
                showToast,
                setGracePeriodActive,
                setGracePeriodEnded,
                setDebtorNotificationDate: vi.fn(),
                setExecutionFeeInjected: vi.fn(),
                setLastActionDate: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleEndGracePeriod();
        });

        expect(setGracePeriodActive).toHaveBeenCalledWith(false);
        expect(setGracePeriodEnded).toHaveBeenCalledWith(true);
        expect(pushTimelineEvent).toHaveBeenCalled();
        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('التنفيذ الجبري'), 'warning');
    });
});
