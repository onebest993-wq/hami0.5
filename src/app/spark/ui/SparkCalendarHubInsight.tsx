import { useCallback, useMemo } from 'react';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { pickActiveCalendarSparkNudge } from '@/app/spark/engine/sparkCalendarEngine';
import {
    buildCalendarSparkSupplementalInput,
    hasCalendarSparkSupplementalSources,
} from '@/app/spark/calendar/calendarSparkSupplementalScan';
import { resolveCalendarHubFollowRoute } from '@/app/spark/calendar/calendarSparkBridge';
import { SparkArchiveInsightShell } from '@/app/spark/ui/sparkArchiveInsightShared';

export const SPARK_HOME_HUB_CALENDAR_ROUTE = 'workspace:schedule:calendar';

export type SparkCalendarHubInsightProps = {
    clusterScanSources: ClusterScanSources;
    secretaryAlerts?: SecretaryAlert[];
    onNavigateRoute: (routePath: string) => void;
    className?: string;
};

/** تنبيه سبارك التقويم داخل تبويب «التنبيهات» في بطاقة الرئيسية */
export function SparkCalendarHubInsight({
    clusterScanSources,
    secretaryAlerts = [],
    onNavigateRoute,
    className = 'px-0 pb-2',
}: SparkCalendarHubInsightProps) {
    const calendarEvents = clusterScanSources.calendarEvents ?? [];
    const supplemental = useMemo(
        () => buildCalendarSparkSupplementalInput(clusterScanSources, secretaryAlerts),
        [clusterScanSources, secretaryAlerts],
    );

    const summary = useMemo(() => {
        if (!calendarEvents.length && !hasCalendarSparkSupplementalSources(supplemental)) {
            return null;
        }
        const ctx = buildCalendarSparkContext(calendarEvents, {
            horizonHours: 168,
            conflictHorizonDays: 7,
        });
        return pickActiveCalendarSparkNudge(ctx, { supplemental });
    }, [calendarEvents, supplemental]);

    const handleOpenTarget = useCallback(() => {
        if (!summary) return;
        const route = resolveCalendarHubFollowRoute(
            calendarEvents,
            summary,
            SPARK_HOME_HUB_CALENDAR_ROUTE,
        );
        onNavigateRoute(route);
    }, [calendarEvents, onNavigateRoute, summary]);

    if (!summary) return null;

    return (
        <SparkArchiveInsightShell
            summary={summary}
            summaryKind={summary.kind}
            preferenceScope="home-hub-calendar"
            onOpenTarget={handleOpenTarget}
            className={className}
        />
    );
}
