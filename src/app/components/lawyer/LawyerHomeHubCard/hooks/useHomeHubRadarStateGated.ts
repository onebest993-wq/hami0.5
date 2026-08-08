import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import {
    filterHomeHubUrgentRadarEvents,
} from '@/app/services/alerts/homeHubCardLogic';
import {
    filterVisibleHomeHubRadarEvents,
    getDismissedHomeHubRadarIds,
} from '@/app/services/alerts/homeHubRadarDismiss';
import { peekHomeHubRadarCache } from '@/app/services/alerts/homeHubRadarWarmCache';
import type { CalendarRadarEvent } from '@/app/workspace/types';
import { useHomeHubRadarState } from './useHomeHubRadarState';

export type UseHomeHubRadarStateGatedResult = ReturnType<typeof useHomeHubRadarState>;

/**
 * رادار 48 ساعة — يُفعَّل فقط على تبويب التنبيهات.
 * خارج التبويب: لا جلب CalendarDB؛ شارات التبويب تُحدَّث عبر useHomeHubDeferredBadgeCounts.
 */
export function useHomeHubRadarStateGated(
    enabled: boolean,
    lawyerId: string | null,
    secretaryAlerts: SecretaryAlert[],
): UseHomeHubRadarStateGatedResult {
    return useHomeHubRadarState(enabled ? lawyerId : null, secretaryAlerts);
}

/** لقطة خفيفة من الكاش لشارات التبويب دون تفعيل useCalendarRadar48h */
export function peekHomeHubRadarUrgentForBadges(
    lawyerId: string | null,
    secretaryAlerts: SecretaryAlert[],
): CalendarRadarEvent[] {
    if (!lawyerId) return [];
    const cached = peekHomeHubRadarCache(lawyerId);
    if (!cached?.length) return [];
    const withoutFieldDupes = filterHomeHubUrgentRadarEvents(cached, secretaryAlerts);
    return filterVisibleHomeHubRadarEvents(withoutFieldDupes, getDismissedHomeHubRadarIds(lawyerId));
}
