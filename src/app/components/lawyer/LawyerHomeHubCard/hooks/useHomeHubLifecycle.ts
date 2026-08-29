import { useEffect, useRef } from 'react';
import { resolveHomeHubShellReady } from '@/app/services/alerts/homeHubCardLogic';
import {
    markHomeHubPerfPhase,
    reportHomeHubPerf,
} from '@/app/services/alerts/homeHubPerfMetrics';

type UseHomeHubLifecycleParams = {
    lawyerId: string | null;
    alertsLoading: boolean;
    hubFullyEmpty: boolean;
    alertsTabCount: number;
    pinsCount: number;
    radarLoading: boolean;
    hadRadarCache: boolean;
    hadAlertsCache: boolean;
};

function markHomeHubInteractiveAndReport(input: {
    lawyerId: string | null;
    alertsTabCount: number;
    pinsCount: number;
    hadRadarCache: boolean;
    hadAlertsCache: boolean;
}): void {
    markHomeHubPerfPhase('interactive');
    reportHomeHubPerf({
        userId: input.lawyerId ?? undefined,
        alertsTabCount: input.alertsTabCount,
        pinsCount: input.pinsCount,
        hadRadarCache: input.hadRadarCache,
        hadAlertsCache: input.hadAlertsCache,
    });
}

export function useHomeHubLifecycle({
    lawyerId,
    alertsLoading,
    hubFullyEmpty,
    alertsTabCount,
    pinsCount,
    radarLoading,
    hadRadarCache,
    hadAlertsCache,
}: UseHomeHubLifecycleParams) {
    const firstPaintRef = useRef(false);
    const reportedRef = useRef(false);

    useEffect(() => {
        if (firstPaintRef.current) return;
        firstPaintRef.current = true;
        markHomeHubPerfPhase('first-paint');
    }, []);

    const isShellReady = resolveHomeHubShellReady({
        alertsLoading,
        radarLoading,
        alertsTabCount,
        pinsCount,
        hubFullyEmpty,
        hadRadarCache,
        hadAlertsCache,
    });

    useEffect(() => {
        if (!isShellReady || reportedRef.current) return;
        reportedRef.current = true;
        markHomeHubInteractiveAndReport({
            lawyerId,
            alertsTabCount,
            pinsCount,
            hadRadarCache,
            hadAlertsCache,
        });
    }, [alertsTabCount, hadAlertsCache, hadRadarCache, isShellReady, lawyerId, pinsCount]);

    /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخرت الجاهزية (H1/H9) */
    useEffect(() => {
        if (reportedRef.current) return;

        const markInteractiveFallback = () => {
            if (reportedRef.current) return;
            reportedRef.current = true;
            if (!firstPaintRef.current) {
                firstPaintRef.current = true;
                markHomeHubPerfPhase('first-paint');
            }
            markHomeHubInteractiveAndReport({
                lawyerId,
                alertsTabCount,
                pinsCount,
                hadRadarCache,
                hadAlertsCache,
            });
        };

        const fallback = window.setTimeout(markInteractiveFallback, 1_200);
        return () => window.clearTimeout(fallback);
    }, [alertsTabCount, hadAlertsCache, hadRadarCache, lawyerId, pinsCount]);

    return { isShellReady };
}
