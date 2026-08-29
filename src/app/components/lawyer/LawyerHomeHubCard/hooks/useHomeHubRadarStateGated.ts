import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { useHomeHubRadarState } from './useHomeHubRadarState';

type UseHomeHubRadarStateGatedResult = ReturnType<typeof useHomeHubRadarState>;

/**
 * رادار 48 ساعة — يُفعَّل فقط عند التسليح (تبويب التنبيهات + حاجة اكتشاف).
 * خارج التسليح: لا جلب CalendarDB؛ شارات التبويب من peekHomeHubRadarUrgentForBadges.
 */
export function useHomeHubRadarStateGated(
    enabled: boolean,
    lawyerId: string | null,
    secretaryAlerts: SecretaryAlert[],
): UseHomeHubRadarStateGatedResult {
    return useHomeHubRadarState(enabled ? lawyerId : null, secretaryAlerts);
}
