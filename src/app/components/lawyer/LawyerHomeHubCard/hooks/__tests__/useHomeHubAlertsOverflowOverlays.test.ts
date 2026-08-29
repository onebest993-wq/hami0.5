import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHomeHubAlertsOverflowOverlays } from '@/app/components/lawyer/LawyerHomeHubCard/hooks/useHomeHubAlertsOverflowOverlays';

describe('useHomeHubAlertsOverflowOverlays', () => {
    it('يغلق الورقة عندما يختفي الفائض ويسخّن المقطع المناسب', () => {
        const prefetchUrgent = vi.fn();
        const prefetchUpcoming = vi.fn();
        const { result, rerender } = renderHook(
            (props: { urgent: number; upcoming: number; isUrgentTab: boolean }) =>
                useHomeHubAlertsOverflowOverlays({
                    isUrgentTab: props.isUrgentTab,
                    urgentOverflowCount: props.urgent,
                    upcomingOverflowCount: props.upcoming,
                    prefetchUrgent,
                    prefetchUpcoming,
                }),
            { initialProps: { urgent: 3, upcoming: 0, isUrgentTab: true } },
        );

        expect(prefetchUrgent).toHaveBeenCalled();
        act(() => {
            result.current.openOverflow();
        });
        expect(result.current.urgentOverlayOpen).toBe(true);

        rerender({ urgent: 0, upcoming: 0, isUrgentTab: true });
        expect(result.current.urgentOverlayOpen).toBe(false);
    });
});
