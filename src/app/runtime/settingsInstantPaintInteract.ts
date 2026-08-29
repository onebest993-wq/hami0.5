import {
    resolveConnectedSettingsOverlayLayer,
    resolveSettingsOverlayLayer,
} from './settingsInstantPaintDom';

export const SETTINGS_OVERLAY_INTERACT_CLASS = 'hami-settings-overlay-layer--interact';
const CLOSE_GUARD_ATTR = 'data-settings-close-guard';

/**
 * مهلة احتياط إن لم يصل pointerup أصلاً (إيماءة معلّقة).
 */
export const SETTINGS_INTERACT_ARM_MS = 800;

let interactArmCleanup: (() => void) | null = null;
/** إصبع فتح الترس — يُحظر الإغلاق ما دامت الإيماءة قائمة؛ يُرفع عند التسليح */
let openingPointerId: number | null = null;

export function isSettingsCloseGuarded(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.hasAttribute(CLOSE_GUARD_ATTR);
}

export function isSettingsOpenGestureBlockingClose(): boolean {
    return openingPointerId != null || isSettingsCloseGuarded();
}

export function beginSettingsOpenGesture(pointerId?: number): void {
    if (typeof pointerId === 'number' && Number.isFinite(pointerId)) {
        openingPointerId = pointerId;
    }
    scheduleSettingsOverlayInteractionArm();
}

function clearOpenGestureBlock(): void {
    openingPointerId = null;
}

export function setSettingsCloseGuard(active: boolean): void {
    if (typeof document === 'undefined') return;
    if (active) document.documentElement.setAttribute(CLOSE_GUARD_ATTR, '1');
    else document.documentElement.removeAttribute(CLOSE_GUARD_ATTR);
}

function clearInteractArmSchedule(): void {
    if (!interactArmCleanup) return;
    interactArmCleanup();
    interactArmCleanup = null;
}

export function resetSettingsOverlayInteractionState(): void {
    clearInteractArmSchedule();
    clearOpenGestureBlock();
    setSettingsCloseGuard(false);
}

export function isSettingsOverlayInteractionArmed(root?: HTMLElement | null): boolean {
    if (isSettingsCloseGuarded()) return false;
    const el = root ?? resolveSettingsOverlayLayer();
    return Boolean(el?.classList.contains(SETTINGS_OVERLAY_INTERACT_CLASS));
}

/** يسمح بالإغلاق بعد انتهاء إيماءة الفتح */
export function armSettingsOverlayInteraction(root?: HTMLElement | null): void {
    resetSettingsOverlayInteractionState();
    const el = resolveConnectedSettingsOverlayLayer(root);
    if (!el) return;
    el.classList.add(SETTINGS_OVERLAY_INTERACT_CLASS);
    el.style.setProperty('pointer-events', 'auto');
}

/** يمنع التفاعل (عند الإخفاء فقط — الطبقة الظاهرة تبقى قابلة للمس) */
export function disarmSettingsOverlayInteraction(root?: HTMLElement | null): void {
    resetSettingsOverlayInteractionState();
    const el = root ?? resolveSettingsOverlayLayer();
    if (!el) return;
    el.classList.remove(SETTINGS_OVERLAY_INTERACT_CLASS);
    if (!el.classList.contains('hami-settings-overlay-layer--visible')) {
        el.style.setProperty('pointer-events', 'none');
    }
}

/**
 * حارس إغلاق على زر X فقط (CSS) حتى ينتهي click إيماءة فتح الترس —
 * Host/Shell يعيدان الاستدعاء: لا تُعاد الجدولة.
 */
export function scheduleSettingsOverlayInteractionArm(root?: HTMLElement | null): void {
    const el = resolveConnectedSettingsOverlayLayer(root);
    if (el?.classList.contains(SETTINGS_OVERLAY_INTERACT_CLASS) && !isSettingsCloseGuarded()) {
        return;
    }
    if (interactArmCleanup) return;

    if (el) {
        el.classList.remove(SETTINGS_OVERLAY_INTERACT_CLASS);
        el.style.setProperty('pointer-events', 'auto');
    }
    setSettingsCloseGuard(true);

    if (typeof window === 'undefined') {
        armSettingsOverlayInteraction();
        return;
    }

    let settled = false;

    const cleanupListeners = () => {
        if (typeof window === 'undefined') return;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', onPointerEnd, true);
        window.removeEventListener('click', swallowGhostClick, true);
        window.clearTimeout(fallbackTimer);
    };

    const armNow = () => {
        if (settled) return;
        settled = true;
        cleanupListeners();
        interactArmCleanup = null;
        armSettingsOverlayInteraction();
    };

    const swallowGhostClick = (event: Event) => {
        const target = event.target;
        if (
            target instanceof Element &&
            target.closest(
                '[data-testid="settings-shell-close"], [data-testid="header-settings-trigger"]',
            )
        ) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
        }
        armNow();
    };

    const onPointerEnd = () => {
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', onPointerEnd, true);
        window.addEventListener('click', swallowGhostClick, true);
    };

    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    const fallbackTimer = window.setTimeout(armNow, SETTINGS_INTERACT_ARM_MS);

    interactArmCleanup = () => {
        settled = true;
        cleanupListeners();
        setSettingsCloseGuard(false);
        interactArmCleanup = null;
    };
}
