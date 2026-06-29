import { useEffect, useState } from 'react';
import { resolveHomeHubShellReady } from '@/app/services/alerts/homeHubCardLogic';
import {
    markHomeHubPerfPhase,
    reportHomeHubPerf,
} from '@/app/services/alerts/homeHubPerfMetrics';
import {
    peekHomeHubSecretaryAlertsCache,
} from '@/app/services/alerts/homeHubSecretaryAlertsWarmCache';
import {
    peekHomeHubRadarCache,
    readHomeHubRadarCache,
} from '@/app/services/alerts/homeHubRadarWarmCache';

export type UseHomeHubLifecycleParams = {
    lawyerId: string | null;
    alertsLoading: boolean;
    hubFullyEmpty: boolean;
    alertsTabCount: number;
    pinsCount: number;
    radarLoading: boolean;
};

export function useHomeHubLifecycle({
    lawyerId,
    alertsLoading,
    hubFullyEmpty,
    alertsTabCount,
    pinsCount,
    radarLoading,
}: UseHomeHubLifecycleParams) {
    const [hadRadarCache, setHadRadarCache] = useState(false);
    const [hadAlertsCache, setHadAlertsCache] = useState(false);

    useEffect(() => {
        if (!lawyerId) {
            setHadRadarCache(false);
            setHadAlertsCache(false);
            return;
        }

        const syncSecretaryCache = () => {
            const secretaryCached = peekHomeHubSecretaryAlertsCache(lawyerId);
            setHadAlertsCache(Boolean(secretaryCached && secretaryCached.length > 0));
        };

        syncSecretaryCache();

        const cached = peekHomeHubRadarCache(lawyerId);
        if (cached && cached.length > 0) {
            setHadRadarCache(true);
        } else {
            let cancelled = false;
            void readHomeHubRadarCache(lawyerId).then((events) => {
                if (!cancelled && events.length > 0) setHadRadarCache(true);
            });
            return () => {
                cancelled = true;
            };
        }

        return undefined;
    }, [lawyerId]);

    useEffect(() => {
        if (!lawyerId || alertsLoading) return;
        const secretaryCached = peekHomeHubSecretaryAlertsCache(lawyerId);
        setHadAlertsCache(Boolean(secretaryCached && secretaryCached.length > 0));
    }, [alertsLoading, lawyerId]);

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
        if (!isShellReady) return;
        markHomeHubPerfPhase('first-paint');
        markHomeHubPerfPhase('interactive');
        reportHomeHubPerf({
            userId: lawyerId ?? undefined,
            alertsTabCount,
            pinsCount,
            hadRadarCache,
            hadAlertsCache,
        });
    }, [alertsTabCount, hadAlertsCache, hadRadarCache, isShellReady, lawyerId, pinsCount]);

    return { isShellReady, hadRadarCache, hadAlertsCache };
}
