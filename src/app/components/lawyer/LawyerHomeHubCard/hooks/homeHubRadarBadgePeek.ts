import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { filterHomeHubUrgentRadarEvents } from '@/app/services/alerts/homeHubRadarCounts';
import {
    filterVisibleHomeHubRadarEvents,
    getDismissedHomeHubRadarIds,
} from '@/app/services/alerts/homeHubRadarDismiss';
import { peekHomeHubRadarCache } from '@/app/services/alerts/homeHubRadarWarmCache';
import type { CalendarRadarEvent } from '@/app/workspace/types';

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
