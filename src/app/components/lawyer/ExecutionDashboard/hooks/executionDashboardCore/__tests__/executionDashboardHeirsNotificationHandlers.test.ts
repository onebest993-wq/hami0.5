import { describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExecutionDashboardHeirsNotificationHandlers } from '../useExecutionDashboardHeirsNotificationHandlers';

describe('useExecutionDashboardHeirsNotificationHandlers', () => {
    it('openHeirsNotificationCenter no-ops when debtor is not deceased', () => {
        const setShowHeirsNotificationModal = vi.fn();
        const { result } = renderHook(() =>
            useExecutionDashboardHeirsNotificationHandlers({
                executionData: { id: 'exec-1', debtors: [{ heirs: ['وريث'] }] },
                debtorBrowserTabsMode: false,
                activeWorkspaceDebtorForFollowup: { d: { name: 'مدين' } },
                activeDebtorIsDeceased: false,
                heirNoticeDateDrafts: {},
                decisionsStorageExecutionId: 'exec-1',
                nextTimelineId: () => 'tl-1',
                persistExecutionMerge: vi.fn(),
                showToast: vi.fn(),
                setTimelineEvents: vi.fn(),
                setHeirNoticeDateDrafts: vi.fn(),
                setHeirSummonsDatePickerOpenByHeir: vi.fn(),
                setShowHeirsNotificationModal,
            }),
        );

        act(() => {
            result.current.openHeirsNotificationCenter();
        });

        expect(setShowHeirsNotificationModal).not.toHaveBeenCalled();
    });
});
