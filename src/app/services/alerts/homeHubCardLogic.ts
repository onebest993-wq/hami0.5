/** بطاقة التنبيهات الكبيرة في الرئيسية — منطق موحّد قابل للاختبار */
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { CalendarRadarEvent, WorkspacePinnedItem } from '@/app/workspace/types';
import { parseWorkspaceRoute } from '@/app/workspace/workspaceRoutes';

export const HOME_HUB_CARD_FEATURE = 'البطاقة الذكية';

/** عدد عناصر المعاينة في تبويبي عاجل/قادم قبل زر «البقية» — ثابت لئلا تتمدد البطاقة */
export const HOME_HUB_ALERTS_TAB_PREVIEW_LIMIT = 2;

/** معاينة قسم الرادار المنفصل (ليس تبويب عاجل/قادم) */
export const HOME_HUB_RADAR_PREVIEW_LIMIT = 3;

/** عدد دبابيس الإضبارات للشارة — بلا تجميع عنقودي */
export function countHomeHubDossierPins(pinnedItems: WorkspacePinnedItem[]): number {
    let count = 0;
    for (const item of pinnedItems) {
        if (item.type !== 'hub') count += 1;
    }
    return count;
}

export type HomeHubPanel = 'alerts' | 'secretary' | 'pins';

const HOME_HUB_PANEL_ORDER: HomeHubPanel[] = ['alerts', 'secretary', 'pins'];

export function resolveNextHomeHubPanel(panel: HomeHubPanel): HomeHubPanel {
    const idx = HOME_HUB_PANEL_ORDER.indexOf(panel);
    if (idx < 0) return 'alerts';
    return HOME_HUB_PANEL_ORDER[(idx + 1) % HOME_HUB_PANEL_ORDER.length];
}

export function resolveDefaultHomeHubPanel(
    alertsTabCount: number,
    secretaryTabCount: number,
    pinsCount: number,
): HomeHubPanel {
    if (alertsTabCount > 0) return 'alerts';
    if (secretaryTabCount > 0) return 'secretary';
    if (pinsCount > 0) return 'pins';
    return 'alerts';
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

export function computeHomeHubSecretaryTabCount(insightCount: number): number {
    return Math.max(0, Math.min(9, insightCount));
}

export function buildCalendarAlertIdSet(secretaryAlerts: SecretaryAlert[]): Set<string> {
    return new Set(
        secretaryAlerts
            .filter((a) => a.id.startsWith('calendar:'))
            .map((a) => a.id.replace('calendar:', '')),
    );
}

/** كيانات مهام ميدانية مُحقونة — لا نُكرّرها في رادار 48 ساعة */
export function buildFieldTaskEntityIdSet(secretaryAlerts: SecretaryAlert[]): Set<string> {
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

type HomeHubRadarRow = {
    id: string;
    sourceEntityId?: string;
};

/** يزيل تكرار الرادار مع كاروسيل التنبيهات (تقويم + مهام ميدانية) */
export function filterHomeHubRadarEvents<T extends HomeHubRadarRow>(
    radarEvents: T[],
    secretaryAlerts: SecretaryAlert[],
): T[] {
    const calendarIds = buildCalendarAlertIdSet(secretaryAlerts);
    const fieldEntities = buildFieldTaskEntityIdSet(secretaryAlerts);
    return filterRadarEventsExcludingCalendarAlerts(radarEvents, calendarIds).filter((ev) => {
        const entityId = String(ev.sourceEntityId ?? '').trim();
        if (entityId && fieldEntities.has(entityId)) return false;
        return true;
    });
}

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

export type HomeHubAlertsEmptyState = 'error' | 'loading' | 'content' | 'empty-filter' | 'empty';

export function resolveHomeHubAlertsEmptyState(input: {
    alertsError: string | null;
    showInitialLoad: boolean;
    hubInitialPending?: boolean;
    hasAlerts: boolean;
    hasCarouselAlerts: boolean;
    hasRadar: boolean;
    radarLoading?: boolean;
}): HomeHubAlertsEmptyState {
    if (input.alertsError) return 'error';
    if (input.hasRadar) return 'content';
    if (input.hubInitialPending || input.showInitialLoad) return 'loading';
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
    secretaryTabCount?: number;
    pinsCount: number;
    alertsError: string | null;
    showInitialLoad: boolean;
    /** لا تطوّ البطاقة أثناء مزامنة التنبيهات/الرادار الأولى */
    hubInitialPending?: boolean;
}): boolean {
    if (input.alertsError) return false;
    if (input.showInitialLoad) return false;
    if (input.hubInitialPending) return false;
    const secretary = input.secretaryTabCount ?? 0;
    return input.alertsTabCount === 0 && secretary === 0 && input.pinsCount === 0;
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
export const HOME_HUB_SPECIAL_NAV_ROUTES = [
    'workspace:schedule:calendar',
    'repository:session',
] as const;

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
    const base =
        panel === 'alerts' ? 'التنبيهات' : panel === 'secretary' ? 'السكرتير' : 'التثبيت';
    if (!shouldShowHomeHubTabBadge(count)) return base;
    return `${base}، ${formatHomeHubTabBadgeCount(count)}`;
}

export const HOME_HUB_SECRETARY_EMPTY_COPY = 'لا توصيات ذكية حالياً — السكرتير يراقب إضابيرك تلقائياً.';

export function resolveHomeHubRadarItemAriaLabel(
    event: Pick<
        CalendarRadarEvent,
        | 'title'
        | 'whenLabel'
        | 'sourceHint'
        | 'dateLabel'
        | 'timeLabel'
        | 'sourceModuleLabel'
        | 'sourcePlace'
        | 'caseNo'
    >,
): string {
    const title = String(event.title ?? '').trim() || 'موعد';
    const moduleLabel = String(event.sourceModuleLabel ?? '').trim();
    const caseNo = String(event.caseNo ?? '').trim();
    const court = String(event.sourcePlace ?? '').trim();
    const dossierRef = caseNo || court;
    const dateLabel = String(event.dateLabel ?? '').trim();
    const schedule = [dateLabel, moduleLabel, dossierRef].filter(Boolean).join(' · ');
    const parts = [title, schedule].filter(Boolean);
    return parts.join('، ');
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

/** عدد عربي لعنوان حاوية الرادار الموسّعة */
export function formatHomeHubRadarOverflowLabel(count: number): string {
    if (count <= 0) return '';
    if (count === 1) return 'تنبيه إضافي واحد';
    if (count === 2) return 'تنبيهاان إضافيان';
    return `${count} تنبيهات إضافية`;
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
