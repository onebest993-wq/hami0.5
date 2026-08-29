/** عدّ تبويب التنبيهات وفلتر رادار «عاجل». */
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent } from '@/app/workspace/types';

function buildCalendarAlertIdSet(secretaryAlerts: SecretaryAlert[]): Set<string> {
    return new Set(
        secretaryAlerts
            .filter((a) => a.id.startsWith('calendar:'))
            .map((a) => a.id.replace('calendar:', '')),
    );
}

/** كيانات مهام ميدانية مُحقونة — لا نُكرّرها في رادار 48 ساعة */
function buildFieldTaskEntityIdSet(secretaryAlerts: SecretaryAlert[]): Set<string> {
    const ids = new Set<string>();
    for (const alert of secretaryAlerts) {
        if (alert.id.startsWith('field-task:') && alert.entityId) {
            ids.add(String(alert.entityId));
        }
        if (alert.fieldTaskInjected && alert.entityId) {
            ids.add(String(alert.entityId));
        }
    }
    return ids;
}

type HomeHubRadarRow = {
    id: string;
    sourceEntityId?: string;
};

/**
 * رادار تبويب «عاجل» — يُبقي مواعيد التقويم (اليوم/غدا) حتى لو لم تُعرض في كاروسيل السكرتير.
 * يُزيل فقط تكرار مهام الميدان المُحقونة.
 */
export function filterHomeHubUrgentRadarEvents<T extends HomeHubRadarRow>(
    radarEvents: T[],
    secretaryAlerts: SecretaryAlert[],
): T[] {
    const fieldEntities = buildFieldTaskEntityIdSet(secretaryAlerts);
    return radarEvents.filter((ev) => {
        const eventId = String(ev.id ?? '').trim();
        if (!eventId) return false;
        if (eventId.includes('appt_judgment_')) return false;
        const entityId = String(ev.sourceEntityId ?? '').trim();
        if (entityId && fieldEntities.has(entityId)) return false;
        return true;
    });
}

/**
 * عدد عناصر تبويب «عاجل» دون تكرار موعد التقويم (سكرتير calendar:* + رادار لنفس ev.id).
 */
export function countUniqueHomeHubUrgentItems(
    secretaryUrgentAlerts: SecretaryAlert[],
    radarEvents: CalendarRadarEvent[],
): number {
    const calendarIds = buildCalendarAlertIdSet(secretaryUrgentAlerts);
    const radarOnlyCount = radarEvents.filter((ev) => {
        const eventId = String(ev.id ?? '').trim();
        return eventId && !calendarIds.has(eventId);
    }).length;
    return secretaryUrgentAlerts.length + radarOnlyCount;
}

export function computeHomeHubAlertsTabCount(
    upcomingCount: number,
    secretaryUrgentAlerts: SecretaryAlert[],
    radarEvents: CalendarRadarEvent[],
): number {
    return countUniqueHomeHubUrgentItems(secretaryUrgentAlerts, radarEvents) + upcomingCount;
}

/**
 * شارة تبويب التنبيهات خارج اللوحة — عاجل السكرتير المؤكد فقط.
 * لا رادار كاش ولا upcoming خام (كانا يُنتجان شارة كاذبة تختفي عند الفتح).
 */
export function computeHomeHubAlertsTabBadgeOffPanel(
    secretaryUrgentAlerts: SecretaryAlert[],
): number {
    if (secretaryUrgentAlerts.length === 0) return 0;
    return countUniqueHomeHubUrgentItems(secretaryUrgentAlerts, []);
}

export function computeHomeHubHorizonTabCounts(
    horizonCounts: Record<'urgent' | 'near' | 'upcoming', number>,
    secretaryUrgentAlerts: SecretaryAlert[],
    radarEvents: CalendarRadarEvent[],
): Record<'urgent' | 'near' | 'upcoming', number> {
    return {
        urgent: countUniqueHomeHubUrgentItems(secretaryUrgentAlerts, radarEvents),
        near: 0,
        upcoming: horizonCounts.upcoming,
    };
}
