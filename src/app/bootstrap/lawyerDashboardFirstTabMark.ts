import { markBootPhase } from '@/app/bootstrap/bootMetrics';
import { FIRST_TAB_OPEN_EVENT } from '@/app/bootstrap/bootEventNames';
import {
    hasLawyerDashboardFirstTabOpenedThisBoot,
    noteLawyerDashboardFirstTabOpenThisBoot,
} from '@/app/bootstrap/lawyerDashboardBootCycle';

export {
    beginLawyerDashboardBootCycle,
    hasLawyerDashboardFirstTabOpenedThisBoot,
    resetLawyerDashboardBootCycleForTests,
} from '@/app/bootstrap/lawyerDashboardBootCycle';

/**
 * يستمع لـ first-tab-open لهذه الدورة فقط — لا علامة performance من إقلاع/HMR سابق.
 */
export function onLawyerDashboardFirstTabOpen(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    if (hasLawyerDashboardFirstTabOpenedThisBoot()) {
        queueMicrotask(cb);
        return () => undefined;
    }
    window.addEventListener(FIRST_TAB_OPEN_EVENT, cb, { once: true });
    return () => window.removeEventListener(FIRST_TAB_OPEN_EVENT, cb);
}

/** علامة first-tab-open مرة واحدة لكل دورة إقلاع — بعد paint شبكة الرئيسية فقط */
export function markLawyerDashboardFirstTabOpenOnce(): void {
    if (!noteLawyerDashboardFirstTabOpenThisBoot()) return;
    markBootPhase('first-tab-open');
    try {
        window.dispatchEvent(new Event(FIRST_TAB_OPEN_EVENT));
    } catch {
        /* ignore */
    }
    void import('@/app/runtime/lawyerDashboardFirstTabWarm')
        .then((m) => m.warmLawyerDashboardFullBootChunks())
        .catch(() => undefined);
}
