import { useEffect, useMemo, useState } from 'react';

import {
    filterHomeHubUrgentRadarEvents,
} from '@/app/services/alerts/homeHubCardLogic';
import {
    filterVisibleHomeHubRadarEvents,
    getDismissedHomeHubRadarIds,
    HOME_HUB_RADAR_DISMISSED_EVENT,
} from '@/app/services/alerts/homeHubRadarDismiss';
import { warmHomeHubRadarCache } from '@/app/services/alerts/homeHubRadarWarmCache';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { useCalendarRadar48h } from '@/app/workspace/useCalendarRadar48h';

export type UseHomeHubRadarStateResult = {
    /** مواعيد اليوم/غداً لعرض تبويب «عاجل» (بدون إخفاء التقويم) */
    radarUrgent: CalendarRadarEvent[];
    radarLoading: boolean;
    hasUrgentRadar: boolean;
};

export function useHomeHubRadarState(
    lawyerId: string | null,
    secretaryAlerts: SecretaryAlert[],
): UseHomeHubRadarStateResult {
    const { events: radarEvents, loading: radarLoading } = useCalendarRadar48h(lawyerId);

    useEffect(() => {
        warmHomeHubRadarCache(lawyerId);
    }, [lawyerId]);

    const [dismissedRadarIds, setDismissedRadarIds] = useState(() =>
        getDismissedHomeHubRadarIds(lawyerId),
    );

    useEffect(() => {
        setDismissedRadarIds(getDismissedHomeHubRadarIds(lawyerId));
    }, [lawyerId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onDismissed = (ev: Event) => {
            const detail = (ev as CustomEvent<{ lawyerId?: string }>).detail;
            const uid = String(lawyerId ?? '').trim();
            if (!uid) return;
            if (detail?.lawyerId && detail.lawyerId !== uid) return;
            setDismissedRadarIds(getDismissedHomeHubRadarIds(lawyerId));
        };
        window.addEventListener(HOME_HUB_RADAR_DISMISSED_EVENT, onDismissed);
        return () => window.removeEventListener(HOME_HUB_RADAR_DISMISSED_EVENT, onDismissed);
    }, [lawyerId]);

    const radarUrgent = useMemo(() => {
        const withoutFieldDupes = filterHomeHubUrgentRadarEvents(radarEvents, secretaryAlerts);
        return filterVisibleHomeHubRadarEvents(withoutFieldDupes, dismissedRadarIds);
    }, [radarEvents, secretaryAlerts, dismissedRadarIds]);

    return {
        radarUrgent,
        radarLoading,
        hasUrgentRadar: radarUrgent.length > 0,
    };
}
