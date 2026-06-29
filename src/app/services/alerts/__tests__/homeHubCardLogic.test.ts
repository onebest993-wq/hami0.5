import { describe, expect, it, vi } from 'vitest';
import {
    HOME_HUB_CARD_FEATURE,
    HOME_HUB_FULLY_EMPTY_COPY,
    buildCalendarAlertIdSet,
    computeHomeHubAlertsTabCount,
    filterRadarEventsExcludingCalendarAlerts,
    formatHomeHubTabBadgeCount,
    isHomeHubFullyEmpty,
    openHomeHubCardInteraction,
    guardedHomeHubNavigateRoute,
    resolveNextHomeHubPanel,
    resolveDefaultHomeHubPanel,
    resolveHomeHubTabAriaLabel,
    resolveHomeHubAlertsEmptyState,
    resolveHomeHubShellReady,
    isSafeHomeHubNavigateRoute,
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

    it('detects fully empty hub card', () => {
        expect(
            isHomeHubFullyEmpty({
                alertsTabCount: 0,
                pinsCount: 0,
                alertsError: null,
                showInitialLoad: false,
            }),
        ).toBe(true);
        expect(
            isHomeHubFullyEmpty({
                alertsTabCount: 1,
                pinsCount: 0,
                alertsError: null,
                showInitialLoad: false,
            }),
        ).toBe(false);
        expect(HOME_HUB_FULLY_EMPTY_COPY).toBe('لا يوجد تنبيه أو تثبيت');
    });

    it('resolves empty states', () => {
        expect(
            resolveHomeHubAlertsEmptyState({
                alertsError: null,
                showInitialLoad: true,
                hasAlerts: false,
                hasCarouselAlerts: false,
                hasRadar: false,
            }),
        ).toBe('loading');
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

    it('opens interactions when signed in', () => {
        const onProceed = vi.fn();
        expect(openHomeHubCardInteraction({ signedIn: true, onProceed })).toBe(true);
        expect(onProceed).toHaveBeenCalledTimes(1);
    });

    it('resolves tab aria labels with badge counts', () => {
        expect(resolveHomeHubTabAriaLabel('alerts', 0)).toBe('التنبيهات');
        expect(resolveHomeHubTabAriaLabel('pins', 3)).toBe('التثبيت، 3');
        expect(resolveHomeHubTabAriaLabel('alerts', 12)).toBe('التنبيهات، 9+');
    });

    it('validates workspace routes before navigate', () => {
        expect(isSafeHomeHubNavigateRoute('workspace:lawsuit:abc-1')).toBe(true);
        expect(isSafeHomeHubNavigateRoute('javascript:alert(1)')).toBe(false);
        expect(isSafeHomeHubNavigateRoute('')).toBe(false);
    });

    it('guardedHomeHubNavigateRoute يرفض مساراً غير آمن', () => {
        const onNavigate = vi.fn();
        const onSignedOut = vi.fn();
        expect(
            guardedHomeHubNavigateRoute('javascript:alert(1)', true, onNavigate, onSignedOut),
        ).toBe(false);
        expect(onNavigate).not.toHaveBeenCalled();
    });

    it('guardedHomeHubNavigateRoute يتطلب تسجيل الدخول', () => {
        const onNavigate = vi.fn();
        const onSignedOut = vi.fn();
        expect(
            guardedHomeHubNavigateRoute('workspace:lawsuit:1', false, onNavigate, onSignedOut),
        ).toBe(false);
        expect(onSignedOut).toHaveBeenCalledTimes(1);
        expect(onNavigate).not.toHaveBeenCalled();
    });

    it('resolveNextHomeHubPanel يُبدّل التبويب', () => {
        expect(resolveNextHomeHubPanel('alerts')).toBe('pins');
        expect(resolveNextHomeHubPanel('pins')).toBe('alerts');
    });

    it('resolves shell ready from loading and cache signals', () => {
        expect(
            resolveHomeHubShellReady({
                alertsLoading: true,
                radarLoading: true,
                alertsTabCount: 0,
                pinsCount: 0,
                hubFullyEmpty: true,
                hadRadarCache: false,
            }),
        ).toBe(false);
        expect(
            resolveHomeHubShellReady({
                alertsLoading: true,
                radarLoading: true,
                alertsTabCount: 0,
                pinsCount: 0,
                hubFullyEmpty: true,
                hadRadarCache: true,
            }),
        ).toBe(true);
        expect(
            resolveHomeHubShellReady({
                alertsLoading: true,
                radarLoading: true,
                alertsTabCount: 0,
                pinsCount: 0,
                hubFullyEmpty: true,
                hadRadarCache: false,
                hadAlertsCache: true,
            }),
        ).toBe(true);
        expect(
            resolveHomeHubShellReady({
                alertsLoading: false,
                radarLoading: false,
                alertsTabCount: 0,
                pinsCount: 2,
                hubFullyEmpty: false,
                hadRadarCache: false,
            }),
        ).toBe(true);
    });
});
