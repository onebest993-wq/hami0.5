/** بطاقة التنبيهات الكبيرة في الرئيسية — منطق موحّد قابل للاختبار */
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

export const HOME_HUB_CARD_FEATURE = 'التنبيهات والتثبيت';

export type HomeHubPanel = 'alerts' | 'pins';

export function resolveDefaultHomeHubPanel(alertsTabCount: number, pinsCount: number): HomeHubPanel {
    return alertsTabCount === 0 && pinsCount > 0 ? 'pins' : 'alerts';
}

export function computeHomeHubAlertsTabCount(
    carouselTotal: number,
    hasCarouselAlerts: boolean,
    radarEventCount: number,
): number {
    const carouselPart = hasCarouselAlerts ? carouselTotal : 0;
    const radarPart = radarEventCount > 0 ? radarEventCount : 0;
    return carouselPart + radarPart;
}

export function buildCalendarAlertIdSet(secretaryAlerts: SecretaryAlert[]): Set<string> {
    return new Set(
        secretaryAlerts
            .filter((a) => a.id.startsWith('calendar:'))
            .map((a) => a.id.replace('calendar:', '')),
    );
}

export function filterRadarEventsExcludingCalendarAlerts<T extends { id: string }>(
    radarEvents: T[],
    calendarIdsFromAlerts: Set<string>,
): T[] {
    return radarEvents.filter((ev) => !calendarIdsFromAlerts.has(ev.id));
}

export type HomeHubAlertsEmptyState = 'error' | 'loading' | 'content' | 'empty-filter' | 'empty';

export function resolveHomeHubAlertsEmptyState(input: {
    alertsError: string | null;
    showInitialLoad: boolean;
    hasAlerts: boolean;
    hasCarouselAlerts: boolean;
    hasRadar: boolean;
}): HomeHubAlertsEmptyState {
    if (input.alertsError) return 'error';
    if (input.showInitialLoad) return 'loading';
    if (input.hasAlerts) return 'content';
    if (input.hasCarouselAlerts) return 'empty-filter';
    if (!input.hasRadar) return 'empty';
    return 'content';
}

export const HOME_HUB_ALERTS_EMPTY_COPY: Record<
    Exclude<HomeHubAlertsEmptyState, 'error' | 'content'>,
    string
> = {
    loading: 'جاري التحميل...',
    'empty-filter': 'لا مواعيد في هذا التصنيف — جرّب تبويباً آخر.',
    empty: 'لا تنبيهات أو مواعيد حالياً.',
};

export type OpenHomeHubCardInteractionInput = {
    signedIn: boolean;
    onProceed: () => void;
    onSignedOut?: () => void;
};

export function openHomeHubCardInteraction(input: OpenHomeHubCardInteractionInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onProceed();
    return true;
}

export function formatHomeHubTabBadgeCount(count: number): string {
    if (count <= 0) return '';
    if (count > 9) return '9+';
    return String(count);
}

export function shouldShowHomeHubTabBadge(count: number): boolean {
    return count > 0;
}
