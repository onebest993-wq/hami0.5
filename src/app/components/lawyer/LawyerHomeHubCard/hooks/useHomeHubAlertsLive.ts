import { useEffect, useMemo, useRef, useState } from 'react';
import {
    computeHomeHubAlertsTabBadgeOffPanel,
    computeHomeHubAlertsTabCount,
    computeHomeHubHorizonTabCounts,
    HOME_HUB_RADAR_WARM_WAIT_MS,
    resolveHomeHubLiveRadarEnabled,
} from '@/app/services/alerts/homeHubCardLogic';
import { pickDefaultHorizonFilter, type AlertTimeHorizon } from '@/app/services/alertTimeClassification';
import {
    invalidateHomeHubRadarCache,
    isHomeHubRadarWarmInFlight,
    peekHomeHubRadarSnapshot,
    subscribeHomeHubRadarWarm,
} from '@/app/services/alerts/homeHubRadarWarmCache';
import { CALENDAR_UPDATED_EVENT } from '@/app/services/calendarBridge.types';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import type { SmartAlert } from '../../NeuralAlertsCard/types';
import { useHomeHubRadarStateGated } from './useHomeHubRadarStateGated';
import type { HomeHubAlertsSource } from './useHomeHubAlertsSource';

function useHomeHubLiveRadarEnabled(
    alertsPanelActive: boolean,
    lawyerId: string | null,
    secretaryAlertCount: number,
): boolean {
    const latchRef = useRef(false);
    const [, setRearmEpoch] = useState(0);
    const [warmWaitTimedOut, setWarmWaitTimedOut] = useState(false);
    const radarCache = peekHomeHubRadarSnapshot(lawyerId);
    const warmInFlight = isHomeHubRadarWarmInFlight(lawyerId);
    const deferForInFlightWarm = warmInFlight && !warmWaitTimedOut && radarCache === null;
    const resolved = resolveHomeHubLiveRadarEnabled({
        alertsPanelActive,
        secretaryAlertCount,
        radarCache,
        latched: latchRef.current,
        deferForInFlightWarm,
    });
    latchRef.current = resolved.latch;

    useEffect(() => subscribeHomeHubRadarWarm(() => setRearmEpoch((epoch) => epoch + 1)), []);

    useEffect(() => {
        if (radarCache !== null || !warmInFlight) {
            setWarmWaitTimedOut(false);
            return undefined;
        }
        const timer = window.setTimeout(() => setWarmWaitTimedOut(true), HOME_HUB_RADAR_WARM_WAIT_MS);
        return () => window.clearTimeout(timer);
    }, [lawyerId, radarCache, warmInFlight]);

    useEffect(() => {
        if (!lawyerId || !alertsPanelActive || resolved.enabled) return undefined;
        const onUpdate = () => {
            invalidateHomeHubRadarCache(lawyerId);
            setRearmEpoch((epoch) => epoch + 1);
        };
        window.addEventListener(CALENDAR_UPDATED_EVENT, onUpdate);
        return () => window.removeEventListener(CALENDAR_UPDATED_EVENT, onUpdate);
    }, [alertsPanelActive, lawyerId, resolved.enabled]);

    return resolved.enabled;
}

type HomeHubAlertsLive = {
    radarUrgent: CalendarRadarEvent[];
    radarLoading: boolean;
    hasUrgentRadar: boolean;
    hubHorizonCounts: Record<AlertTimeHorizon, number>;
    carouselAlerts: SmartAlert[];
    sourceById: Map<string, SecretaryAlert>;
    hasCarouselAlerts: boolean;
    hasAlerts: boolean;
    alertsTabCount: number;
};

/** رادار + كاروسيل + عدّ التبويب بعد تفعيل لوحة التنبيهات. */
export function useHomeHubAlertsLive({
    lawyerId,
    secretaryAlerts,
    alertsPanelActive,
    badgeRadarUrgent,
    source,
}: {
    lawyerId: string | null;
    secretaryAlerts: SecretaryAlert[];
    alertsPanelActive: boolean;
    badgeRadarUrgent: CalendarRadarEvent[];
    source: HomeHubAlertsSource;
}): HomeHubAlertsLive {
    const radarEnabled = useHomeHubLiveRadarEnabled(
        alertsPanelActive,
        lawyerId,
        secretaryAlerts.length,
    );
    const {
        radarUrgent: liveRadarUrgent,
        radarLoading,
    } = useHomeHubRadarStateGated(radarEnabled, lawyerId, secretaryAlerts);

    const panelRadarUrgent = useMemo(() => {
        if (!alertsPanelActive) return [];
        if (liveRadarUrgent.length > 0) return liveRadarUrgent;
        if (radarLoading && badgeRadarUrgent.length > 0) return badgeRadarUrgent;
        return liveRadarUrgent;
    }, [alertsPanelActive, badgeRadarUrgent, liveRadarUrgent, radarLoading]);

    const radarUrgent = alertsPanelActive ? panelRadarUrgent : badgeRadarUrgent;
    const hasUrgentRadar = panelRadarUrgent.length > 0;

    const scheduledFilter: AlertTimeHorizon =
        source.activeFilter === 'near' || source.activeFilter === 'upcoming' ? 'upcoming' : 'urgent';

    const { carouselAlerts, sourceById } = useMemo(() => {
        const alerts = source.alertsForFilter(scheduledFilter);
        const sources = source.sourcesForFilter(scheduledFilter);
        const map = new Map<string, SecretaryAlert>();
        for (const a of sources) map.set(a.id, a);
        const safeAlerts = alerts.filter((a) => map.has(a.id));
        return { carouselAlerts: safeAlerts, sourceById: map };
    }, [source.alertsForFilter, source.sourcesForFilter, scheduledFilter]);

    const hubHorizonCounts = useMemo(
        () =>
            alertsPanelActive
                ? computeHomeHubHorizonTabCounts(
                      source.horizonCounts,
                      source.urgentSecretaryAlerts,
                      panelRadarUrgent,
                  )
                : { urgent: 0, near: 0, upcoming: 0 },
        [alertsPanelActive, source.horizonCounts, source.urgentSecretaryAlerts, panelRadarUrgent],
    );

    const alertsPanelHorizonInitRef = useRef(false);
    useEffect(() => {
        if (!alertsPanelActive) {
            alertsPanelHorizonInitRef.current = false;
            return undefined;
        }
        if (alertsPanelHorizonInitRef.current) return undefined;
        alertsPanelHorizonInitRef.current = true;
        source.setActiveFilter(pickDefaultHorizonFilter(hubHorizonCounts));
        return undefined;
    }, [alertsPanelActive, hubHorizonCounts, source.setActiveFilter]);

    const hasCarouselAlerts = source.carouselTotal > 0;
    const hasAlerts = carouselAlerts.length > 0;

    const alertsTabCount = useMemo(() => {
        if (!alertsPanelActive) {
            return computeHomeHubAlertsTabBadgeOffPanel(source.urgentSecretaryAlerts);
        }
        return computeHomeHubAlertsTabCount(
            hubHorizonCounts.upcoming,
            source.urgentSecretaryAlerts,
            panelRadarUrgent,
        );
    }, [
        alertsPanelActive,
        hubHorizonCounts.upcoming,
        source.urgentSecretaryAlerts,
        panelRadarUrgent,
    ]);

    return {
        radarUrgent,
        radarLoading,
        hasUrgentRadar,
        hubHorizonCounts,
        carouselAlerts,
        sourceById,
        hasCarouselAlerts,
        hasAlerts,
        alertsTabCount,
    };
}
