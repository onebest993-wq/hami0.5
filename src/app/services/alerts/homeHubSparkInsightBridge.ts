import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import { buildCalendarSparkContext } from '@/app/spark/context/calendarSparkContext';
import { pickActiveCalendarSparkNudge } from '@/app/spark/engine/sparkCalendarEngine';
import {
    buildCalendarSparkSupplementalInput,
    collectCalendarSupplementalSparkNudges,
} from '@/app/spark/calendar/calendarSparkSupplementalScan';
import {
    buildHomeProceduralAttentionNudges,
    scanHomeSparkHits,
} from '@/app/spark/engine/homeSparkAggregateScan';
import { isSparkNudgeSuppressed } from '@/app/spark/memory/sparkPreferenceStore';
import type { SparkNudge } from '@/app/spark/types';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { buildCalendarAlertIdSet } from '@/app/services/alerts/homeHubCardLogic';

export type HomeHubSparkInsights = {
    calendar: SparkNudge | null;
    /** إشعار مستقل لكل (قسم + موضوع + إضبارة) */
    homeNudges: SparkNudge[];
};

const CALENDAR_KINDS_COVERED_BY_RADAR = new Set([
    'calendar.hearing_today',
    'calendar.deadline_near',
    'calendar.deadline_overdue',
]);

function isCalendarNudgeCoveredByRadar(nudge: SparkNudge, radarEvents: CalendarRadarEvent[]): boolean {
    if (!CALENDAR_KINDS_COVERED_BY_RADAR.has(nudge.kind)) return false;
    const target = String(nudge.targetFileId ?? '').trim();
    if (!target) return false;
    return radarEvents.some((event) => String(event.id ?? '').trim() === target);
}

function isCalendarNudgeCoveredBySecretary(nudge: SparkNudge, calendarAlertIds: Set<string>): boolean {
    if (nudge.kind !== 'calendar.secretary_schedule_alert') return false;
    const raw = String(nudge.id ?? '').replace(/^calendar-secretary:/, '');
    return calendarAlertIds.has(`calendar:${raw}`) || calendarAlertIds.has(raw);
}

function isVisibleSparkNudge(
    nudge: SparkNudge | null,
    preferenceScope: string,
): nudge is SparkNudge {
    if (!nudge) return false;
    return !isSparkNudgeSuppressed(nudge.kind, preferenceScope);
}

export function resolveHomeHubSparkInsights(
    clusterScanSources: ClusterScanSources,
    secretaryAlerts: SecretaryAlert[] = [],
    radarEvents: CalendarRadarEvent[] = [],
): HomeHubSparkInsights {
    const calendarEvents = clusterScanSources.calendarEvents ?? [];
    const supplemental = buildCalendarSparkSupplementalInput(clusterScanSources, secretaryAlerts);
    const calendarAlertIds = buildCalendarAlertIdSet(secretaryAlerts);

    let calendar: SparkNudge | null = null;
    if (calendarEvents.length || supplemental.lawsuitFiles?.length || supplemental.notes?.length) {
        const ctx = buildCalendarSparkContext(calendarEvents, {
            horizonHours: 168,
            conflictHorizonDays: 7,
        });
        const picked = pickActiveCalendarSparkNudge(ctx, { supplemental });
        const supplementalOnly = collectCalendarSupplementalSparkNudges(ctx, supplemental);
        const isSupplemental =
            picked &&
            supplementalOnly.some((item) => item.id === picked.id);
        const coveredByFeed =
            picked &&
            !isSupplemental &&
            (isCalendarNudgeCoveredByRadar(picked, radarEvents) ||
                isCalendarNudgeCoveredBySecretary(picked, calendarAlertIds));
        calendar = coveredByFeed ? null : picked;
    }

    const homeHits = scanHomeSparkHits(clusterScanSources, { maxHitsPerSection: 6, maxTotal: 24 });
    const homeNudges = buildHomeProceduralAttentionNudges(homeHits).filter((nudge) =>
        isVisibleSparkNudge(nudge, 'home-hub'),
    );

    return {
        calendar: isVisibleSparkNudge(calendar, 'home-hub-calendar') ? calendar : null,
        homeNudges,
    };
}

export function hasHomeHubSparkInsights(insights: HomeHubSparkInsights): boolean {
    return Boolean(insights.calendar || insights.homeNudges.length > 0);
}

/** قائمة توصيات سبارك/السكرتير للتبويب المخصص */
export function listHomeHubSparkInsightsForSecretaryPanel(
    insights: HomeHubSparkInsights,
): SparkNudge[] {
    const items: SparkNudge[] = [];
    if (insights.calendar) items.push(insights.calendar);
    items.push(...insights.homeNudges);
    return items;
}

export function countHomeHubSparkInsightsForSecretaryTab(insights: HomeHubSparkInsights): number {
    return listHomeHubSparkInsightsForSecretaryPanel(insights).length;
}

/** تعزيز شارة التبويب — شارة واحدة كحد أقصى في التذييل التكميلي */
export function countHomeHubSparkInsightTabBoost(insights: HomeHubSparkInsights): number {
    return pickHomeHubSparkInsightForFooter(insights) ? 1 : 0;
}

/** سطر سبارك واحد في أسفل التبويب — لا يحل محل عاجل/قادم */
export function pickHomeHubSparkInsightForFooter(
    insights: HomeHubSparkInsights,
    options?: { suppressHomeAggregateWhenTraditionalAlerts?: boolean },
): SparkNudge | null {
    if (insights.calendar) return insights.calendar;
    if (
        options?.suppressHomeAggregateWhenTraditionalAlerts &&
        insights.homeNudges.some((nudge) => nudge.kind === 'home.procedural_attention_summary')
    ) {
        return null;
    }
    return insights.homeNudges[0] ?? null;
}
