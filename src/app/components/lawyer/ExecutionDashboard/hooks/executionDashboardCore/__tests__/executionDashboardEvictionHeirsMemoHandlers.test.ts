import { describe, expect, it, vi } from 'vitest';
import { useExecutionDashboardEvictionHeirsMemoHandlers } from '../useExecutionDashboardEvictionHeirsMemoHandlers';
import { renderHook } from '@testing-library/react';

describe('useExecutionDashboardEvictionHeirsMemoHandlers', () => {
    it('persists heirs notification date and appends timeline procedure', () => {
        const persistExecutionMerge = vi.fn();
        const appendEvictionProcedure = vi.fn();
        const setEvictionHeirsNotificationDateYmd = vi.fn();

        const { result } = renderHook(() =>
            useExecutionDashboardEvictionHeirsMemoHandlers({
                evictionHeirsNotificationDateYmd: '2026-01-15',
                setEvictionHeirsNotificationDateYmd,
                persistExecutionMerge,
                appendEvictionProcedure,
            }),
        );

        result.current.handleEvictionHeirsNotificationDateChange('2026-02-01');
        expect(setEvictionHeirsNotificationDateYmd).toHaveBeenCalledWith('2026-02-01');
        expect(persistExecutionMerge).toHaveBeenCalledWith({
            eviction_heirs_notification_date_ymd: '2026-02-01',
        });

        result.current.handleIssueHeirsExecutionNoticeMemo();
        expect(appendEvictionProcedure).toHaveBeenCalledTimes(1);
    });
});
