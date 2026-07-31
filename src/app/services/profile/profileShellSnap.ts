/**
 * فتح/إغلاق الملف المهني لحظياً.
 * المصدر الوحيد للحقيقة البصرية: html[data-hami-profile-open]
 * (React يعيد className على الأسطح ويمسح أي snap قائم على class — هذا لا يُمسَح).
 */

const PROFILE_SURFACE = '[data-testid="lawyer-dashboard-profile-surface"]';
const ATTR = 'data-hami-profile-open';

/** يُبطِل rAF معلق عند إغلاق فقط — لا عند جدولة مزامنة لاحقة لنفس الفتح */
let shellSyncGen = 0;

export function isProfileShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}

/** @returns true إذا وُجد سطح الملف (keepAlive) */
export function snapProfileShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    const profile = document.querySelector(PROFILE_SURFACE);
    if (!profile) return false;
    document.documentElement.setAttribute(ATTR, '1');
    return true;
}

export function snapProfileShellClose(): void {
    if (typeof document === 'undefined') return;
    shellSyncGen += 1;
    document.documentElement.removeAttribute(ATTR);
}

/**
 * بعد أول رسم للـ snap — مزامنة React دون مسح العلم على html.
 * لا يزيد الجيل — حتى لا تلغي جدولة finally/فتح لاحق لنفس الدورة.
 * الإغلاق عبر snapProfileShellClose يبطل كل rAF معلّق.
 */
export function scheduleProfileShellReactSync(run: () => void): void {
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
