import { describe, expect, it, vi } from 'vitest';
import {
    HOME_HUB_CARD_FEATURE,
    HOME_HUB_FULLY_EMPTY_COPY,
    buildCalendarAlertIdSet,
    computeHomeHubAlertsTabCount,
    computeHomeHubAlertsTabBadgeOffPanel,
    countUniqueHomeHubUrgentItems,
    filterRadarEventsExcludingCalendarAlerts,
    filterHomeHubRadarEvents,
    filterHomeHubUrgentRadarEvents,
    computeHomeHubHorizonTabCounts,
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
        expect(HOME_HUB_CARD_FEATURE).toBe('البطاقة الذكية');
    });

    it('defaults to pins when only pins exist', () => {
        expect(resolveDefaultHomeHubPanel(0, 0, 3)).toBe('pins');
        expect(resolveDefaultHomeHubPanel(2, 0, 3)).toBe('alerts');
        expect(resolveDefaultHomeHubPanel(0, 2, 0)).toBe('secretary');
    });

    it('off-panel alerts badge ignores radar cache and upcoming raw counts', () => {
        const secretaryUrgent = [{ id: 'lawsuit:1' } as never];
        const radar = [
            { id: 'ev-1' } as never,
            { id: 'ev-2' } as never,
            { id: 'ev-3' } as never,
        ];
        expect(computeHomeHubAlertsTabBadgeOffPanel(secretaryUrgent)).toBe(1);
        expect(computeHomeHubAlertsTabBadgeOffPanel([])).toBe(0);
        expect(computeHomeHubAlertsTabCount(3, [], radar)).toBe(6);
    });

    it('computes alerts tab count without double-counting calendar radar', () => {
        const secretaryUrgent = [
            { id: 'calendar:ev-1' } as never,
            { id: 'lawsuit:1' } as never,
        ];
        const radar = [{ id: 'ev-1' }, { id: 'ev-2' }] as never[];
        expect(countUniqueHomeHubUrgentItems(secretaryUrgent, radar)).toBe(3);
        expect(computeHomeHubAlertsTabCount(2, secretaryUrgent, radar)).toBe(5);
        expect(computeHomeHubAlertsTabCount(0, [], [{ id: 'ev-2' } as never])).toBe(1);
    });

    it('dedupes calendar duplicates in unique urgent count', () => {
        const secretaryUrgent = [
            { id: 'calendar:ev-1' } as never,
            { id: 'calendar:ev-2' } as never,
        ];
        const radar = [
            { id: 'ev-1' } as never,
            { id: 'ev-2' } as never,
            { id: 'ev-3' } as never,
        ];
        expect(countUniqueHomeHubUrgentItems(secretaryUrgent, radar)).toBe(3);
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

    it('dedupes radar field-task rows when injected alert exists', () => {
        const filtered = filterHomeHubRadarEvents(
            [
                { id: 'ev-1', sourceEntityId: 'task-9' },
                { id: 'ev-2', sourceEntityId: 'task-8' },
            ],
            [{ id: 'field-task:task-9', entityId: 'task-9', fieldTaskInjected: true } as never],
        );
        expect(filtered.map((e) => e.id)).toEqual(['ev-2']);
    });

    it('urgent radar keeps calendar rows even when calendar secretary alerts exist', () => {
        const filtered = filterHomeHubUrgentRadarEvents(
            [
                { id: 'ev-1', sourceEntityId: 'case-1' },
                { id: 'ev-2', sourceEntityId: 'task-9' },
            ],
            [
                { id: 'calendar:ev-1' } as never,
                { id: 'field-task:task-9', entityId: 'task-9', fieldTaskInjected: true } as never,
            ],
        );
        expect(filtered.map((e) => e.id)).toEqual(['ev-1']);
    });

    it('merges urgent tab counts without calendar double-count', () => {
        const secretaryUrgent = [
            { id: 'calendar:ev-1' } as never,
            { id: 'lawsuit:1' } as never,
        ];
        const radar = [{ id: 'ev-1' }, { id: 'ev-2' }] as never[];
        expect(
            computeHomeHubHorizonTabCounts({ urgent: 2, near: 0, upcoming: 2 }, secretaryUrgent, radar),
        ).toEqual({ urgent: 3, near: 0, upcoming: 2 });
    });

    it('hides mirrored judgment dates from home hub radar', () => {
        const filtered = filterRadarEventsExcludingCalendarAlerts(
            [
                { id: 'appt_judgment_stage-1' },
                { id: 'hami_bridge_lawsuit_1783156902323_appt_judgment_stage_1783189537629' },
                { id: 'appt_appeal_deadline_stage-1' },
                { id: 'ev-2' },
            ],
            new Set<string>(),
        );
        expect(filtered.map((e) => e.id)).toEqual(['appt_appeal_deadline_stage-1', 'ev-2']);
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
                alertsTabCount: 0,
                pinsCount: 0,
                alertsError: null,
                showInitialLoad: false,
                hubInitialPending: true,
            }),
        ).toBe(false);
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
                showInitialLoad: true,
                hasAlerts: false,
                hasCarouselAlerts: false,
                hasRadar: true,
            }),
        ).toBe('content');
        expect(
            resolveHomeHubAlertsEmptyState({
                alertsError: null,
                showInitialLoad: false,
                hasAlerts: false,
                hasCarouselAlerts: false,
                hasRadar: false,
                radarLoading: true,
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
        expect(
            resolveHomeHubAlertsEmptyState({
                alertsError: null,
                showInitialLoad: false,
                hubInitialPending: false,
                hasAlerts: false,
                hasCarouselAlerts: false,
                hasRadar: false,
                radarLoading: false,
            }),
        ).toBe('empty');
        expect(
            resolveHomeHubAlertsEmptyState({
                alertsError: null,
                showInitialLoad: false,
                hasAlerts: false,
                hasCarouselAlerts: true,
                hasRadar: true,
            }),
        ).toBe('content');
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
        expect(isSafeHomeHubNavigateRoute('repository:session')).toBe(true);
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
        expect(resolveNextHomeHubPanel('alerts')).toBe('secretary');
        expect(resolveNextHomeHubPanel('secretary')).toBe('pins');
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
