/**
 * فتح موجز المهمة القادمة من تنبيه/بحث: مرة واحدة لكل focusTaskId.
 * إعادة الربط مع كل تغيّر في `tasks` كانت تعيد فتح اللوحة بعد إغلاق المستخدم.
 */
export function consumeFocusTaskBrief(
    focusTaskId: string | undefined,
    appliedRef: { current: string | null },
    hasTask: boolean,
): boolean {
    if (!focusTaskId) {
        appliedRef.current = null;
        return false;
    }
    if (!hasTask) return false;
    if (appliedRef.current === focusTaskId) return false;
    appliedRef.current = focusTaskId;
    return true;
}
