import { useCallback, useMemo } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import {
    resolveCalendarHubFollowRoute,
} from '@/app/spark/calendar/calendarSparkBridge';
import { SPARK_HOME_HUB_CALENDAR_ROUTE } from '@/app/spark/ui/SparkCalendarHubInsight';
import {
    resolveHomeSparkRoutePath,
    scanHomeSparkHits,
} from '@/app/spark/engine/homeSparkAggregateScan';
import { SparkArchiveInsightShell } from '@/app/spark/ui/sparkArchiveInsightShared';
import {
    pickHomeHubSparkInsightForFooter,
    resolveHomeHubSparkInsights,
} from '@/app/services/alerts/homeHubSparkInsightBridge';

export type HomeHubSparkInsightsSectionProps = {
    clusterScanSources: ClusterScanSources;
    secretaryAlerts?: SecretaryAlert[];
    radarEvents?: CalendarRadarEvent[];
    hasTraditionalAlerts?: boolean;
    onNavigateRoute: (routePath: string) => void;
};

/** تذييل تكميلي — سطر سبارك واحد بعد تبويبي عاجل/قادم */
export function HomeHubSparkInsightsSection({
    clusterScanSources,
    secretaryAlerts = [],
    radarEvents = [],
    hasTraditionalAlerts = false,
    onNavigateRoute,
}: HomeHubSparkInsightsSectionProps) {
    const calendarEvents = clusterScanSources.calendarEvents ?? [];
    const insights = useMemo(
        () => resolveHomeHubSparkInsights(clusterScanSources, secretaryAlerts, radarEvents),
        [clusterScanSources, secretaryAlerts, radarEvents],
    );
    const footerNudge = useMemo(
        () =>
            pickHomeHubSparkInsightForFooter(insights, {
                suppressHomeAggregateWhenTraditionalAlerts: hasTraditionalAlerts,
            }),
        [hasTraditionalAlerts, insights],
    );
    const homeHits = useMemo(
        () => scanHomeSparkHits(clusterScanSources, { maxHitsPerSection: 6, maxTotal: 24 }),
        [clusterScanSources],
    );

    const handleOpenTarget = useCallback(
        (targetFileId: string) => {
            if (!footerNudge) return;
            if (footerNudge.kind.startsWith('calendar.')) {
                onNavigateRoute(
                    resolveCalendarHubFollowRoute(
                        calendarEvents,
                        footerNudge,
                        SPARK_HOME_HUB_CALENDAR_ROUTE,
                    ),
                );
                return;
            }
            const routePath = resolveHomeSparkRoutePath(homeHits, targetFileId);
            if (routePath) onNavigateRoute(routePath);
        },
        [calendarEvents, footerNudge, homeHits, onNavigateRoute],
    );

    if (!footerNudge) return null;

    const preferenceScope = footerNudge.kind.startsWith('calendar.')
        ? 'home-hub-calendar'
        : 'home-hub';
    const summaryKind =
        footerNudge.kind === 'home.procedural_attention_summary'
            ? 'home.procedural_attention_summary'
            : footerNudge.kind;

    return (
        <div
            className="hami-hub-spark-insights"
            data-testid="home-hub-spark-insights"
            data-spark-footer="1"
        >
            <SparkArchiveInsightShell
                summary={footerNudge}
                summaryKind={summaryKind}
                preferenceScope={preferenceScope}
                onOpenTarget={handleOpenTarget}
                className="px-0 pt-2 pb-0"
            />
        </div>
    );
}
