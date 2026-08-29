/**
 * فتح/إغلاق التقويم لحظياً.
 * المصدر الوحيد للحقيقة البصرية: html[data-hami-schedule-open]
 * (React يعيد className على الأسطح — هذا لا يُمسَح).
 */

const SCHEDULE_SURFACE = '[data-testid="lawyer-dashboard-schedule-surface"]';
const ATTR = 'data-hami-schedule-open';

export const SCHEDULE_SHELL_SNAP_EVENT = 'hami:schedule-shell-snap';

export type ScheduleShellSnapDetail = {
    open: boolean;
    hasSurface: boolean;
};

let shellSyncGen = 0; /* يُبطِل rAF معلّق عند الإغلاق قبل وجود السطح — Host التقويم كسول */

function stampCalendarOpenPerfMarksFromSnap(): void {
    if (typeof performance === 'undefined' || typeof performance.mark !== 'function') return;
    try {
        performance.mark('hami:calendar:open-request');
        performance.mark('hami:calendar:first-paint');
        performance.mark('hami:calendar:interactive');
    } catch {
        /* ignore */
    }
}

function emitScheduleShellSnap(detail: ScheduleShellSnapDetail): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(SCHEDULE_SHELL_SNAP_EVENT, { detail }));
}

export function isScheduleShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

/** @returns true إذا وُجد سطح التقويم (keepAlive) — العلم يُوضَع حتى بلا سطح */
export function snapScheduleShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    const alreadyOpen = document.documentElement.getAttribute(ATTR) === '1';
    document.documentElement.setAttribute(ATTR, '1');
    if (!alreadyOpen) stampCalendarOpenPerfMarksFromSnap();
    const hasSurface = Boolean(document.querySelector(SCHEDULE_SURFACE));
    emitScheduleShellSnap({ open: true, hasSurface });
    return hasSurface;
}

export function snapScheduleShellClose(): void {
    if (typeof document === 'undefined') return;
    shellSyncGen += 1;
    document.documentElement.removeAttribute(ATTR);
    emitScheduleShellSnap({ open: false, hasSurface: false });
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
