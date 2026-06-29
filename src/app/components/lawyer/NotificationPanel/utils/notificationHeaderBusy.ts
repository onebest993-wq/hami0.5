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

export function isNotificationPanelColdLoading(
    isLoading: boolean,
    visibleCount: number,
    hasCaseShareContent: boolean,
): boolean {
    return isLoading && visibleCount === 0 && !hasCaseShareContent;
}
