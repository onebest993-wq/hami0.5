/** بطاقة التنبيهات الكبيرة في الرئيسية — منطق موحّد قابل للاختبار */
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import { parseWorkspaceRoute } from '@/app/workspace/workspaceRoutes';

export const HOME_HUB_CARD_FEATURE = 'التنبيهات والتثبيت';

export type HomeHubPanel = 'alerts' | 'pins';

export function resolveNextHomeHubPanel(panel: HomeHubPanel): HomeHubPanel {
    return panel === 'alerts' ? 'pins' : 'alerts';
}

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

/** بطاقة مطوية — لا تنبيهات ولا تثبيت */
export const HOME_HUB_FULLY_EMPTY_COPY = 'لا يوجد تنبيه أو تثبيت';

export function isHomeHubFullyEmpty(input: {
    alertsTabCount: number;
    pinsCount: number;
    alertsError: string | null;
    showInitialLoad: boolean;
}): boolean {
    if (input.alertsError) return false;
    if (input.showInitialLoad) return false;
    return input.alertsTabCount === 0 && input.pinsCount === 0;
}

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

/** يتحقق أن مسار workspace آمن قبل التنقل من البطاقة */
export function isSafeHomeHubNavigateRoute(routePath: string): boolean {
    if (!routePath || typeof routePath !== 'string') return false;
    return parseWorkspaceRoute(routePath) !== null;
}

export function guardedHomeHubNavigateRoute(
    routePath: string,
    signedIn: boolean,
    onNavigate: (routePath: string) => void,
    onSignedOut?: () => void,
): boolean {
    if (!isSafeHomeHubNavigateRoute(routePath)) return false;
    return openHomeHubCardInteraction({
        signedIn,
        onProceed: () => onNavigate(routePath),
        onSignedOut,
    });
}

export function formatHomeHubTabBadgeCount(count: number): string {
    if (count <= 0) return '';
    if (count > 9) return '9+';
    return String(count);
}

export function shouldShowHomeHubTabBadge(count: number): boolean {
    return count > 0;
}

export function resolveHomeHubTabAriaLabel(panel: HomeHubPanel, count: number): string {
    const base = panel === 'alerts' ? 'التنبيهات' : 'التثبيت';
    if (!shouldShowHomeHubTabBadge(count)) return base;
    return `${base}، ${formatHomeHubTabBadgeCount(count)}`;
}

export function resolveHomeHubShellReady(input: {
    alertsLoading: boolean;
    radarLoading: boolean;
    alertsTabCount: number;
    pinsCount: number;
    hubFullyEmpty: boolean;
    hadRadarCache: boolean;
    hadAlertsCache?: boolean;
}): boolean {
    return (
        (!input.alertsLoading && !input.radarLoading) ||
        input.alertsTabCount > 0 ||
        input.pinsCount > 0 ||
        (!input.hubFullyEmpty && !input.alertsLoading) ||
        input.hadRadarCache ||
        Boolean(input.hadAlertsCache)
    );
}
