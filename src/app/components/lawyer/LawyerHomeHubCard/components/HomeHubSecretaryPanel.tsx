import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { HOME_HUB_SECRETARY_EMPTY_COPY } from '@/app/services/alerts/homeHubCardLogic';
import {
    listHomeHubSparkInsightsForSecretaryPanel,
    resolveHomeHubSparkInsights,
} from '@/app/services/alerts/homeHubSparkInsightBridge';
import { resolveCalendarHubFollowRoute } from '@/app/spark/calendar/calendarSparkBridge';
import { SPARK_HOME_HUB_CALENDAR_ROUTE } from '@/app/spark/ui/SparkCalendarHubInsight';
import { resolveHomeSparkRoutePath, scanHomeSparkHits } from '@/app/spark/engine/homeSparkAggregateScan';
import type { SparkNudge } from '@/app/spark/types';
import { splitHomeHubSecretaryNudges } from '../homeHub/homeHubSecretaryOverflow';
import { useHomeHubSecretaryNudgesSettled } from '../hooks/useHomeHubSecretaryNudgesSettled';
import { HomeHubEmptyState } from './HomeHubRadarSection';
import { HomeHubSecretaryInsightCard } from './HomeHubSecretaryInsightCard';
import { HomeHubSecretaryMoreOverlay } from './HomeHubSecretaryMoreOverlay';
import { HomeHubTabMoreTrigger } from './HomeHubTabMoreTrigger';

export type HomeHubSecretaryPanelProps = {
    clusterScanSources?: ClusterScanSources;
    secretaryAlerts?: SecretaryAlert[];
    radarEvents?: CalendarRadarEvent[];
    onNavigate: (routePath: string) => void;
};

function HomeHubSecretaryInsightStack({
    nudges,
    previewMode,
    onOpenTarget,
}: {
    nudges: SparkNudge[];
    previewMode?: boolean;
    onOpenTarget: (targetFileId: string, kind: string) => void;
}) {
    return (
        <div
            className={`hami-hub-secretary-stack${previewMode ? ' hami-hub-secretary-stack--preview' : ''}`}
            data-testid={previewMode ? 'home-hub-secretary-preview' : 'home-hub-secretary-stack'}
        >
            {nudges.map((nudge) => {
                const preferenceScope = nudge.kind.startsWith('calendar.') ? 'home-hub-calendar' : 'home-hub';
                const summaryKind =
                    nudge.kind === 'home.procedural_attention_summary'
                        ? 'home.procedural_attention_summary'
                        : nudge.kind;
                return (
                    <HomeHubSecretaryInsightCard
                        key={nudge.id}
                        nudge={nudge}
                        summaryKind={summaryKind}
                        preferenceScope={preferenceScope}
                        onOpenTarget={(targetFileId) => onOpenTarget(targetFileId, nudge.kind)}
                    />
                );
            })}
        </div>
    );
}

export function HomeHubSecretaryPanel({
    clusterScanSources,
    secretaryAlerts = [],
    radarEvents = [],
    onNavigate,
}: HomeHubSecretaryPanelProps) {
    const keyboardInset = useMobileKeyboardInset(true);
    const [moreOverlayOpen, setMoreOverlayOpen] = useState(false);

    const calendarEvents = clusterScanSources?.calendarEvents ?? [];

    const insights = useMemo(
        () =>
            clusterScanSources
                ? resolveHomeHubSparkInsights(clusterScanSources, secretaryAlerts, radarEvents)
                : { calendar: null, homeNudges: [] },
        [clusterScanSources, secretaryAlerts, radarEvents],
    );

    const nudges = useMemo(() => listHomeHubSparkInsightsForSecretaryPanel(insights), [insights]);
    const settledNudges = useHomeHubSecretaryNudgesSettled(nudges);

    const { preview, overflowCount, hasOverflow } = useMemo(
        () => splitHomeHubSecretaryNudges(settledNudges),
        [settledNudges],
    );

    const homeHits = useMemo(
        () =>
            clusterScanSources
                ? scanHomeSparkHits(clusterScanSources, { maxHitsPerSection: 6, maxTotal: 24 })
                : [],
        [clusterScanSources],
    );

    useEffect(() => {
        if (!hasOverflow) setMoreOverlayOpen(false);
    }, [hasOverflow]);

    const openNudge = useCallback(
        (targetFileId: string, kind: string) => {
            if (kind.startsWith('calendar.')) {
                const match = settledNudges.find((n) => n.targetFileId === targetFileId);
                onNavigate(
                    resolveCalendarHubFollowRoute(
                        calendarEvents,
                        match ?? settledNudges[0]!,
                        SPARK_HOME_HUB_CALENDAR_ROUTE,
                    ),
                );
                return;
            }
            const routePath = resolveHomeSparkRoutePath(homeHits, targetFileId);
            if (routePath) onNavigate(routePath);
        },
        [calendarEvents, homeHits, settledNudges, onNavigate],
    );

    return (
        <div
            id="home-hub-panel-secretary"
            role="tabpanel"
            aria-labelledby="home-hub-tab-secretary"
            data-testid="home-hub-panel-secretary"
            className="hami-hub-secretary-panel"
        >
            <div
                className={`hami-hub-secretary-feed${hasOverflow ? ' hami-hub-secretary-feed--has-more' : ''}`}
                data-testid="home-hub-secretary-feed"
                style={
                    keyboardInset > 0
                        ? {
                              paddingBottom: `max(${keyboardInset}px, env(safe-area-inset-bottom, 0px))`,
                          }
                        : undefined
                }
            >
                {!clusterScanSources || settledNudges.length === 0 ? (
                    <HomeHubEmptyState
                        message={HOME_HUB_SECRETARY_EMPTY_COPY}
                        testId="home-hub-secretary-empty"
                        compact
                    />
                ) : (
                    <>
                        <HomeHubSecretaryInsightStack
                            nudges={preview}
                            previewMode={hasOverflow}
                            onOpenTarget={openNudge}
                        />
                        {hasOverflow ? (
                            <div className="hami-hub-secretary-more-dock">
                                <HomeHubTabMoreTrigger
                                    layout="dock"
                                    count={overflowCount}
                                    onClick={() => setMoreOverlayOpen(true)}
                                    ariaLabel={`عرض كل توصيات السكرتير — ${nudges.length} عنصر`}
                                    testId="home-hub-secretary-more-trigger"
                                />
                            </div>
                        ) : null}
                        <HomeHubSecretaryMoreOverlay
                            open={moreOverlayOpen}
                            nudges={settledNudges}
                            onClose={() => setMoreOverlayOpen(false)}
                            onOpenTarget={openNudge}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
