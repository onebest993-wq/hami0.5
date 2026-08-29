import { reconcileBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { isHamiNativeShell } from '@/app/runtime/hamiNativeShell';

const SNAP_CLOSE_ATTR = 'data-hami-overlay-snap-close';
export const OVERLAY_UNFREEZE_ATTR = 'data-hami-overlay-unfreeze';

const DASHBOARD_SELECTOR = '[data-hami-lawyer-dashboard]';

/** يعيد رسم اللوحة تحت الطبقة المعتمة قبل إخفائها */
function beginOverlayCoveredUnfreeze(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute(OVERLAY_UNFREEZE_ATTR, '1');
    const dash = document.querySelector<HTMLElement>(DASHBOARD_SELECTOR);
    if (!dash) return;
    void dash.offsetHeight;
    const grid = dash.querySelector<HTMLElement>('[data-testid="home-main-grid"]');
    if (grid) void grid.offsetHeight;
}

export function clearOverlayCoveredUnfreeze(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(OVERLAY_UNFREEZE_ATTR);
}

/** يعطّل انتقالات CSS لإطار واحد — إغلاق فوري لكل الطبقات */
export function markOverlaySnapClosing(): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute(SNAP_CLOSE_ATTR, '1');
    queueMicrotask(() => {
        root.removeAttribute(SNAP_CLOSE_ATTR);
    });
}

export type OverlaySnapCloseSteps = {
    conceal?: () => void;
    commit?: () => void;
    releaseScrollLock?: boolean;
};

/**
 * مسار إغلاق موحّد: إخفاء DOM → commit React متزامن → تحرير scroll lock.
 * يُستخدم لكل الأقسام بدل rAF / flushSync / تأخيرات متفرقة.
 */
export function executeOverlaySnapClose(steps: OverlaySnapCloseSteps): void {
    markOverlaySnapClosing();
    steps.conceal?.();
    steps.commit?.();
    if (steps.releaseScrollLock !== false) {
        reconcileBodyScrollLock();
    }
}

/**
 * إغلاق إعدادات/إشعارات/بحث: أعد رسم الرئيسية تحت الطبقة ثم أخفِ الورقة والتعتيم معاً.
 */
export function executeOverlayCoveredUnfreezeClose(steps: OverlaySnapCloseSteps): void {
    beginOverlayCoveredUnfreeze();
    markOverlaySnapClosing();
    steps.conceal?.();
    steps.commit?.();
    clearOverlayCoveredUnfreeze();
    if (steps.releaseScrollLock !== false) {
        reconcileBodyScrollLock();
    }
}

function executeOpaqueOverlayClose(steps: OverlaySnapCloseSteps): void {
    if (isHamiNativeShell()) {
        executeOverlaySnapClose(steps);
        return;
    }
    executeOverlayCoveredUnfreezeClose(steps);
}

/**
 * إغلاق الإعدادات: الطبقة معتمة بالكامل — لا unfreeze للوحة
 * (كان يعيد تخطيط الرئيسية فيبدو المنزل وكأنه يُحمَّل من جديد).
 */
export function executeSettingsOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOverlaySnapClose(steps);
}

/** إغلاق الإشعارات: طبقة معتمة — لا unfreeze يعيد تخطيط الرئيسية */
export function executeNotificationsOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOverlaySnapClose(steps);
}

/** إغلاق البحث الشامل: طبقة معتمة — لا unfreeze يعيد تخطيط الرئيسية */
export function executeGlobalSearchOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOverlaySnapClose(steps);
}

/** إغلاق الملف المهني: لا unfreeze يعيد تخطيط الرئيسية تحت الطبقة */
export function executeProfileOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOverlaySnapClose(steps);
}

/** إغلاق التقويم — داخل اللوحة مثل الملف؛ على الأصلي بلا unfreeze يخفي المنزل */
export function executeScheduleOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOpaqueOverlayClose(steps);
}

/** إغلاق مركز المعاملات — طبقة معتمة؛ على الأصلي بلا unfreeze للوحة */
export function executeTransactionsOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOpaqueOverlayClose(steps);
}

/** إغلاق ستارة الميدان — على الأصلي بلا unfreeze يخفي المنزل */
export function executeFieldTasksOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOpaqueOverlayClose(steps);
}

/** إغلاق أجندة المهام — طبقة معتمة كاملة؛ على الأصلي بلا unfreeze للوحة */
export function executeTasksManagerOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOpaqueOverlayClose(steps);
}

/** إغلاق المستودع — طبقة معتمة؛ على الأصلي بلا unfreeze للوحة */
export function executeRepositoryOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOpaqueOverlayClose(steps);
}

/** إغلاق المنتدى — طبقة معتمة؛ على الأصلي بلا unfreeze للوحة */
export function executeForumOverlayClose(steps: OverlaySnapCloseSteps): void {
    executeOpaqueOverlayClose(steps);
}
