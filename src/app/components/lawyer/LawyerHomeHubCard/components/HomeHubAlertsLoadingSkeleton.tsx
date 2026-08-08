/** هيكل تحميل ثابت الارتفاع — المحتوى فقط (التبويبات تُرسم دائماً في البطاقة) */
export function HomeHubAlertsLoadingSkeleton() {
    return (
        <div
            className="hami-hub-alerts-loading"
            data-testid="home-hub-alerts-loading"
            role="status"
            aria-label="جاري تحميل التنبيهات"
        >
            <div className="hami-hub-alerts-loading__card" aria-hidden />
            <span className="sr-only">جاري تحميل التنبيهات</span>
        </div>
    );
}
