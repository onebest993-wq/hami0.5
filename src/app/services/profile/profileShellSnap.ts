/**
 * فتح/إغلاق الملف المهني لحظياً.
 * المصدر الوحيد للحقيقة البصرية: html[data-hami-profile-open]
 * أثناء الإغلاق: html[data-hami-profile-closing] يفرض إخفاء السطح حتى لو
 * React مسح inline styles وأبقى --active (سبب الشاشة السوداء + الهيدر).
 */

import { wasProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';

const PROFILE_SURFACE = '[data-testid="lawyer-dashboard-profile-surface"]';
const OPEN_ATTR = 'data-hami-profile-open';
const CLOSING_ATTR = 'data-hami-profile-closing';

function recordE2eSnapClose(blocked: boolean): void {
    if (!isViteE2eHooksEnabled() || typeof window === 'undefined') return;
    const w = window as Window & {
        __hamiE2eLastProfileSnapClose?: {
            blocked: boolean;
            at: number;
            stack: string;
        };
    };
    w.__hamiE2eLastProfileSnapClose = {
        blocked,
        at: Date.now(),
        stack: new Error().stack?.split('\n').slice(0, 14).join('\n') ?? '',
    };
}

export function isProfileShellSnappedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(OPEN_ATTR) === '1';
}

export function isProfileShellClosing(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(CLOSING_ATTR) === '1';
}

export function clearProfileShellClosing(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
}

/**
 * يضع علم الفتح فوراً حتى بلا سطح مركّب —
 * يخفي غطاء الرئيسية والهيدر بالـ CSS قبل اكتمال React/chunk.
 * @returns true إذا وُجد سطح الملف في DOM
 */
export function snapProfileShellOpen(): boolean {
    if (typeof document === 'undefined') return false;
    clearProfileShellClosing();
    document.documentElement.setAttribute(OPEN_ATTR, '1');
    const surface = document.querySelector(PROFILE_SURFACE);
    return surface instanceof HTMLElement;
}

export function snapProfileShellClose(): void {
    if (typeof document === 'undefined') return;
    /* جلسة فتح قائمة: لا تمسح snap من مسار جانبي (إعادة تركيب اللوحة / إغلاق دعاوى).
     * الإغلاق المقصود يصفّر النية أولاً (runProfileClosePaint / returnToLawyerHome). */
    if (wasProfileOpenedThisPage()) {
        recordE2eSnapClose(true);
        return;
    }
    const wasOpen = document.documentElement.getAttribute(OPEN_ATTR) === '1';
    recordE2eSnapClose(false);
    document.documentElement.removeAttribute(OPEN_ATTR);
    /* حزمة E2E تتخطى التلاشي — closing العالق كان يبقي z-index 200 فوق الرئيسية */
    const skipClosingFade =
        import.meta.env.VITE_E2E === '1' || import.meta.env.VITE_E2E === 'true';
    if (wasOpen && !skipClosingFade) {
        document.documentElement.setAttribute(CLOSING_ATTR, '1');
    }
}

/** للاختبارات */
export function resetProfileShellSnapForTests(): void {
    if (typeof document !== 'undefined') {
        document.documentElement.removeAttribute(OPEN_ATTR);
        document.documentElement.removeAttribute(CLOSING_ATTR);
    }
}
