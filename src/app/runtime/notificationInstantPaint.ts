/** كشف/إخفاء لوحة الإشعارات فوراً في الـ DOM — مستقل عن إطار React */

const LAYER_SELECTOR = '[data-notification-root]';
const INTERACT_CLASS = 'hami-notif-layer--interact';
/** علامة توافق — منع الإغلاق الشبحي يتم بمهلة JS على الخلفية/الإغلاق، لا عبر PE:none. */
const INTERACT_ARM_MS = 320;
const INTERACT_AFTER_POINTER_UP_MS = 80;

let forceVisible = false;
let interactArmCleanup: (() => void) | null = null;

export function isNotificationForceVisible(): boolean {
    return forceVisible;
}

export function clearNotificationForceVisible(): void {
    forceVisible = false;
}

function clearInteractArmSchedule(): void {
    if (!interactArmCleanup) return;
    interactArmCleanup();
    interactArmCleanup = null;
}

export function armNotificationOverlayInteraction(root?: HTMLElement | null): void {
    clearInteractArmSchedule();
    const el =
        root ??
        (typeof document !== 'undefined'
            ? (document.querySelector(LAYER_SELECTOR) as HTMLElement | null)
            : null);
    if (!el) return;
    el.classList.add(INTERACT_CLASS);
    el.style.setProperty('pointer-events', 'auto');
}

/**
 * يؤجّل علامة --interact مع الإبقاء على pointer-events: auto فور الظهور.
 */
export function scheduleNotificationOverlayInteractionArm(root?: HTMLElement | null): void {
    const el =
        root ??
        (typeof document !== 'undefined'
            ? (document.querySelector(LAYER_SELECTOR) as HTMLElement | null)
            : null);
    if (!el) return;

    clearInteractArmSchedule();
    el.classList.remove(INTERACT_CLASS);
    el.style.setProperty('pointer-events', 'auto');

    if (typeof window === 'undefined') {
        armNotificationOverlayInteraction(el);
        return;
    }

    let settled = false;
    let armTimer: number | null = null;

    const cleanupListeners = () => {
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', onPointerEnd, true);
        window.clearTimeout(fallbackTimer);
    };

    const armSoon = (delayMs: number) => {
        if (settled) return;
        settled = true;
        cleanupListeners();
        if (delayMs <= 0) {
            interactArmCleanup = null;
            armNotificationOverlayInteraction(el);
            return;
        }
        armTimer = window.setTimeout(() => {
            armTimer = null;
            interactArmCleanup = null;
            armNotificationOverlayInteraction(el);
        }, delayMs) as unknown as number;
        interactArmCleanup = () => {
            if (armTimer != null) window.clearTimeout(armTimer);
            armTimer = null;
        };
    };

    const onPointerEnd = () => armSoon(INTERACT_AFTER_POINTER_UP_MS);
    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', onPointerEnd, true);
    const fallbackTimer = window.setTimeout(() => armSoon(0), INTERACT_ARM_MS);

    interactArmCleanup = () => {
        settled = true;
        cleanupListeners();
        if (armTimer != null) window.clearTimeout(armTimer);
        armTimer = null;
    };
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    if (visible) {
        root.style.setProperty('opacity', '1');
        root.style.setProperty('visibility', 'visible');
        root.style.setProperty('pointer-events', 'auto');
        root.classList.add('hami-notif-layer--visible');
        root.classList.remove(INTERACT_CLASS);
        root.setAttribute('data-open', 'true');
        root.removeAttribute('aria-hidden');
        root.removeAttribute('inert');
    } else {
        clearInteractArmSchedule();
        root.style.setProperty('opacity', '0');
        root.style.setProperty('visibility', 'hidden');
        root.style.setProperty('pointer-events', 'none');
        root.classList.remove('hami-notif-layer--visible');
        root.classList.remove(INTERACT_CLASS);
        root.setAttribute('data-open', 'false');
        root.setAttribute('aria-hidden', 'true');
        root.setAttribute('inert', '');
    }
    void root.offsetHeight;
}

export function revealNotificationWarmPanel(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.querySelector(LAYER_SELECTOR);
    if (!(root instanceof HTMLElement)) return false;

    forceVisible = true;
    applyLayerVisible(root, true);
    scheduleNotificationOverlayInteractionArm(root);
    return true;
}

export function concealNotificationWarmPanel(): void {
    forceVisible = false;
    clearInteractArmSchedule();
    if (typeof document === 'undefined') return;
    const root = document.querySelector(LAYER_SELECTOR);
    if (root instanceof HTMLElement) applyLayerVisible(root, false);
}
