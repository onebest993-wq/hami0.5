/**
 * مؤشر الانشغال في رأس الإشعارات — يظهر فقط عند التحميل الأول بدون بيانات مخزّنة.
 * التحديث الخلفي (polling) لا يُظهر spinner في الرأس.
 */
export function isNotificationHeaderBusy(
    isLoading: boolean,
    hasCachedNotifications: boolean,
): boolean {
    return isLoading && !hasCachedNotifications;
}

/**
 * تحميل بارد للقائمة — يُظهر هيكل التحميل (skeleton) فقط عند أول ترطيب فعلي
 * (لا hydration سابق) مع عدم وجود عناصر ظاهرة أو محتوى مشاركة قضية.
 * `hasHydratedOnce` يمنع ومضة skeleton فوق حالة فارغة مستقرة أثناء polling الخلفي.
 */
export function isNotificationPanelColdLoading(
    isLoading: boolean,
    visibleCount: number,
    hasCaseShareContent: boolean,
    hasHydratedOnce: boolean,
): boolean {
    return isLoading && !hasHydratedOnce && visibleCount === 0 && !hasCaseShareContent;
}
