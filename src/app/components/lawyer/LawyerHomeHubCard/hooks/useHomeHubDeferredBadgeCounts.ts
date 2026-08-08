import { useEffect, useState } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { computeHomeHubSecretaryTabCount } from '@/app/services/alerts/homeHubCardLogic';
import {
    countHomeHubSparkInsightsForSecretaryTab,
    resolveHomeHubSparkInsights,
} from '@/app/services/alerts/homeHubSparkInsightBridge';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { peekHomeHubRadarUrgentForBadges } from './useHomeHubRadarStateGated';

export type HomeHubDeferredBadgeCounts = {
    secretaryTabCount: number;
    radarUrgent: CalendarRadarEvent[];
    ready: boolean;
};

const INITIAL: HomeHubDeferredBadgeCounts = {
    secretaryTabCount: 0,
    radarUrgent: [],
    ready: false,
};

/**
 * شارات التبويبات خارج اللوحة النشطة — تُحسب بعد الخمول من الكاش/سبارك
 * دون تفعيل CalendarDB أو تجميع التثبيت.
 */
export function useHomeHubDeferredBadgeCounts(params: {
    lawyerId: string | null;
    clusterScanSources: ClusterScanSources;
    secretaryAlerts: SecretaryAlert[];
    /** عند true تُوقَف الحسابات المؤجّلة (اللوحة النشطة تزوّد البيانات الحية) */
    suspend: boolean;
}): HomeHubDeferredBadgeCounts {
    const { lawyerId, clusterScanSources, secretaryAlerts, suspend } = params;
    const [counts, setCounts] = useState<HomeHubDeferredBadgeCounts>(INITIAL);

    useEffect(() => {
        if (suspend) {
            setCounts(INITIAL);
            return undefined;
        }

        let cancelled = false;

        const compute = () => {
            if (cancelled) return;
            const radarUrgent = peekHomeHubRadarUrgentForBadges(lawyerId, secretaryAlerts);
            const insights = resolveHomeHubSparkInsights(
                clusterScanSources,
                secretaryAlerts,
                radarUrgent,
            );
            const secretaryTabCount = computeHomeHubSecretaryTabCount(
                countHomeHubSparkInsightsForSecretaryTab(insights),
            );
            setCounts({
                secretaryTabCount,
                radarUrgent,
                ready: true,
            });
        };

        const initialBoot =
            typeof document !== 'undefined' && document.documentElement.dataset.hamiInitialBoot === '1';
        if (initialBoot) {
            compute();
            return () => {
                cancelled = true;
            };
        }

        compute();

        return () => {
            cancelled = true;
        };
    }, [clusterScanSources, lawyerId, secretaryAlerts, suspend]);

    return counts;
}
