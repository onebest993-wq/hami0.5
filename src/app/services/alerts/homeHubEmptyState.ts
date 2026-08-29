/** فراغ البطاقة وحالات التحميل الأولى — دوال نقية قابلة للاختبار. */

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

/** رسالة خطأ ثابتة — لا تُعرض سلسلة الشبكة/المكدس في الواجهة */
export const HOME_HUB_ALERTS_ERROR_COPY = 'تعذر تحميل التنبيهات';

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

export function resolveHomeHubInitialPending(input: {
    alertsLoading: boolean;
    alertsPanelActive: boolean;
    radarLoading: boolean;
    hasCarouselAlerts: boolean;
    hasUrgentRadar: boolean;
    pinCountForState: number;
    alertsError: string | null;
    hadSecretaryCache: boolean;
    hadRadarCachePeek: boolean;
}): boolean {
    return (
        Boolean(input.alertsLoading || (input.alertsPanelActive && input.radarLoading)) &&
        !input.hasCarouselAlerts &&
        !input.hasUrgentRadar &&
        input.pinCountForState === 0 &&
        !input.alertsError &&
        !input.hadSecretaryCache &&
        !input.hadRadarCachePeek
    );
}

export function resolveHomeHubShowInitialLoad(input: {
    alertsLoading: boolean;
    hasCarouselAlerts: boolean;
    hasUrgentRadar: boolean;
    alertsError: string | null;
    hadSecretaryCache: boolean;
    alertsPanelActive: boolean;
    radarLoading: boolean;
}): boolean {
    return (
        (input.alertsLoading &&
            !input.hasCarouselAlerts &&
            !input.hasUrgentRadar &&
            !input.alertsError &&
            !input.hadSecretaryCache) ||
        (input.alertsPanelActive &&
            input.radarLoading &&
            !input.hasUrgentRadar &&
            !input.hasCarouselAlerts &&
            !input.alertsError)
    );
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
