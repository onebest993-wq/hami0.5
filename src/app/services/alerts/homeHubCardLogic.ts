/** بطاقة التنبيهات الكبيرة في الرئيسية — منطق موحّد قابل للاختبار */
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent } from '@/app/workspace/types';
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
    return radarEvents.filter((ev) => {
        const eventId = String(ev.id ?? '').trim();
        if (!eventId) return false;
        if (calendarIdsFromAlerts.has(eventId)) return false;
        // تاريخ الحكم لا يجب أن يظهر داخل رادار الـ Home Hub ولا أن يقود لأي بطاقة/ملاحة منه.
        if (eventId.includes('appt_judgment_')) return false;
        return true;
    });
}

export type HomeHubAlertsEmptyState = 'error' | 'loading' | 'content' | 'empty-filter' | 'empty';

export function resolveHomeHubAlertsEmptyState(input: {
    alertsError: string | null;
    showInitialLoad: boolean;
    hasAlerts: boolean;
    hasCarouselAlerts: boolean;
    hasRadar: boolean;
    radarLoading?: boolean;
}): HomeHubAlertsEmptyState {
    if (input.alertsError) return 'error';
    if (input.showInitialLoad) return 'loading';
    if (
        input.radarLoading &&
        !input.hasAlerts &&
        !input.hasCarouselAlerts &&
        !input.hasRadar
    ) {
        return 'loading';
    }
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
    /** لا تطوّ البطاقة أثناء مزامنة التنبيهات/الرادار الأولى */
    hubInitialPending?: boolean;
}): boolean {
    if (input.alertsError) return false;
    if (input.showInitialLoad) return false;
    if (input.hubInitialPending) return false;
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

/** مسارات تنقّل خاصة مسموحة من البطاقة/الدوك وليست أنواع تثبيت */
export const HOME_HUB_SPECIAL_NAV_ROUTES = ['workspace:schedule:calendar'] as const;

/** يتحقق أن مسار workspace آمن قبل التنقل من البطاقة */
export function isSafeHomeHubNavigateRoute(routePath: string): boolean {
    if (!routePath || typeof routePath !== 'string') return false;
    const trimmed = routePath.trim();
    if ((HOME_HUB_SPECIAL_NAV_ROUTES as readonly string[]).includes(trimmed)) return true;
    return parseWorkspaceRoute(trimmed) !== null;
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

export function resolveHomeHubRadarItemAriaLabel(
    event: Pick<CalendarRadarEvent, 'title' | 'whenLabel'>,
): string {
    const title = String(event.title ?? '').trim() || 'موعد';
    const whenLabel = String(event.whenLabel ?? '').trim();
    return whenLabel ? `${title}، ${whenLabel}` : title;
}

export function resolveHomeHubRadarDismissAriaLabel(
    event: Pick<CalendarRadarEvent, 'title'>,
): string {
    const title = String(event.title ?? '').trim() || 'الموعد';
    return `إخفاء ${title} من البطاقة`;
}

export function resolveHomeHubPinNavigateAriaLabel(input: {
    headline: string;
    sectionLabel: string;
    clientLine?: string;
    caseLine?: string;
    relatedCount?: number;
}): string {
    const headline = input.headline.trim() || input.sectionLabel.trim() || 'عنصر مثبت';
    const details = [
        input.sectionLabel.trim(),
        String(input.clientLine ?? '').trim(),
        String(input.caseLine ?? '').trim(),
        input.relatedCount && input.relatedCount > 0 ? `${input.relatedCount} ارتباط` : '',
    ].filter(Boolean);

    return [headline, ...details.filter((detail) => detail !== headline)].join('، ');
}

export function resolveHomeHubPinUnpinAriaLabel(headline: string): string {
    const safeHeadline = headline.trim() || 'العنصر';
    return `إلغاء تثبيت ${safeHeadline}`;
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
