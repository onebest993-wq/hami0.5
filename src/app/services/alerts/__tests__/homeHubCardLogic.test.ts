import { describe, expect, it, vi } from 'vitest';
import {
    HOME_HUB_CARD_FEATURE,
    buildCalendarAlertIdSet,
    computeHomeHubAlertsTabCount,
    filterRadarEventsExcludingCalendarAlerts,
    formatHomeHubTabBadgeCount,
    openHomeHubCardInteraction,
    resolveDefaultHomeHubPanel,
    resolveHomeHubAlertsEmptyState,
    HOME_HUB_ALERTS_EMPTY_COPY,
} from '@/app/services/alerts/homeHubCardLogic';

describe('homeHubCardLogic', () => {
    it('uses Arabic feature label', () => {
        expect(HOME_HUB_CARD_FEATURE).toBe('التنبيهات والتثبيت');
    });

    it('defaults to pins when only pins exist', () => {
        expect(resolveDefaultHomeHubPanel(0, 3)).toBe('pins');
        expect(resolveDefaultHomeHubPanel(2, 3)).toBe('alerts');
    });

    it('computes alerts tab count from carousel and radar', () => {
        expect(computeHomeHubAlertsTabCount(5, true, 2)).toBe(7);
        expect(computeHomeHubAlertsTabCount(5, false, 2)).toBe(2);
    });

    it('dedupes radar events already shown as calendar alerts', () => {
        const ids = buildCalendarAlertIdSet([
            { id: 'calendar:ev-1' } as never,
            { id: 'lawsuit:1' } as never,
        ]);
        const filtered = filterRadarEventsExcludingCalendarAlerts(
            [{ id: 'ev-1' }, { id: 'ev-2' }],
            ids,
        );
        expect(filtered.map((e) => e.id)).toEqual(['ev-2']);
    });

    it('resolves empty states', () => {
        expect(
            resolveHomeHubAlertsEmptyState({
                alertsError: null,
                showInitialLoad: false,
                hasAlerts: false,
                hasCarouselAlerts: false,
                hasRadar: false,
            }),
        ).toBe('empty');
        expect(HOME_HUB_ALERTS_EMPTY_COPY.empty).toBe('لا تنبيهات أو مواعيد حالياً.');
    });

    it('blocks interactions when signed out', () => {
        const onProceed = vi.fn();
        const onSignedOut = vi.fn();
        expect(openHomeHubCardInteraction({ signedIn: false, onProceed, onSignedOut })).toBe(false);
        expect(onProceed).not.toHaveBeenCalled();
        expect(onSignedOut).toHaveBeenCalledTimes(1);
    });

    it('formats tab badge counts', () => {
        expect(formatHomeHubTabBadgeCount(12)).toBe('9+');
        expect(formatHomeHubTabBadgeCount(4)).toBe('4');
    });
});
