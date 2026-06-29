import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardNotifyDebtorHandler } from '../useExecutionDashboardNotifyDebtorHandler';

describe('useExecutionDashboardNotifyDebtorHandler', () => {
    it('blocks subsequent notice when not unlocked', () => {
        const showToast = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardNotifyDebtorHandler({
                executionData: { id: 'exec-1' },
                unifiedSummonsTargetDebtorKey: 'primary_debtor',
                primaryDebtorKeyResolved: 'primary_debtor',
                activeDebtorNoticeScope: {},
                debtorNotificationDate: null,
                notificationPurpose: '',
                notificationCount: 2,
                subsequentNoticeUnlocked: false,
                isEvictionExecutionModule: false,
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge: vi.fn(),
                showToast,
                setDebtorNotificationDate: vi.fn(),
                setLastActionDate: vi.fn(),
                setActiveNoticeState: vi.fn(),
                setNoticeVoluntaryPeriodEndOptimistic: vi.fn(),
                setVoluntaryEndOptimistic: vi.fn(),
                setNotificationCount: vi.fn(),
                setTimelineEvents: vi.fn((fn) => (typeof fn === 'function' ? fn([]) : fn)),
                setDebtorSummonsMarkerLocal: vi.fn(),
                setNotificationPurpose: vi.fn(),
                setSummonsMarkerPopoverOpen: vi.fn(),
            }),
        );

        act(() => {
            result.current.handleNotifyDebtor('2026-01-01');
        });

        expect(showToast).toHaveBeenCalledWith(expect.stringContaining('سجّل حضور المدين'), 'warning');
    });
});
