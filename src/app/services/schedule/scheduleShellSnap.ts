/**
 * فتح/إغلاق التقويم لحظياً.
 * المصدر الوحيد للحقيقة البصرية: html[data-hami-schedule-open]
 * (React يعيد className على الأسطح — هذا لا يُمسَح).
 */

const SCHEDULE_SURFACE = '[data-testid="lawyer-dashboard-schedule-surface"]';
const ATTR = 'data-hami-schedule-open';

let shellSyncGen = 0;

export function isScheduleShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

/** @returns true إذا وُجد سطح التقويم (keepAlive) */
export function snapScheduleShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    const surface = document.querySelector(SCHEDULE_SURFACE);
    if (!surface) return false;
    document.documentElement.setAttribute(ATTR, '1');
    return true;
}

export function snapScheduleShellClose(): void {
    if (typeof document === 'undefined') return;
    shellSyncGen += 1;
    document.documentElement.removeAttribute(ATTR);
}

/** مزامنة React فورية على مسار الإغلاق — بلا انتظار إطار */
export function runShellReactSyncNow(run: () => void): void {
    run();
}

/** مزامنة React بعد أول رسم للـ snap — بلا مسح العلم على html */
export function scheduleShellReactSync(run: () => void): void {
    if (typeof window === 'undefined') {
        run();
        return;
    }
    const gen = shellSyncGen;
    window.requestAnimationFrame(() => {
        if (gen !== shellSyncGen) return;
        run();
    });
}
