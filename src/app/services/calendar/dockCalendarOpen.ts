/** فتح التقويم من دوك الرئيسية — منطق موحّد قابل للاختبار */
export const CALENDAR_DOCK_FEATURE = 'التقويم';

export type DockCalendarOpenInput = {
    signedIn: boolean;
    onOpenCalendar?: () => void;
    onSignedOut?: () => void;
};

/** يُرجع true إذا فُتح التقويم */
export function openCalendarFromDock(input: DockCalendarOpenInput): boolean {
    if (!input.signedIn) {
        input.onSignedOut?.();
        return false;
    }
    input.onOpenCalendar?.();
    return true;
}

/** الشارة على أيقونة التقويم — تنبيهات عاجلة (لا تُعيد توجيه النقر) */
export function shouldShowCalendarDockBadge(urgentAlertsCount: number): boolean {
    return urgentAlertsCount > 0;
}
