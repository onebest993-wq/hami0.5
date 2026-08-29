/** كشف/إخفاء مركز الإعدادات فوراً في الـ DOM — مستقل عن إطار React */

import {
    isSettingsShellSnappedOpen,
    snapSettingsShellClose,
    snapSettingsShellOpen,
} from '@/app/services/settings/settingsShellSnap';
import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    detachSettingsInstantBridge,
    ensureSettingsInstantChromeBridge,
} from './settingsInstantPaintBridge';
import {
    applySettingsThemeChrome,
} from './settingsInstantPaintChrome';
import {
    SETTINGS_GEAR_TRIGGER_SELECTOR,
    SETTINGS_INSTANT_CHROME,
    SETTINGS_OVERLAY_HOST_SELECTOR,
} from './settingsInstantPaintConstants';
import {
    armSettingsOverlayInteraction,
    isSettingsCloseGuarded,
    resetSettingsOverlayInteractionState,
    scheduleSettingsOverlayInteractionArm,
    setSettingsCloseGuard,
    SETTINGS_OVERLAY_INTERACT_CLASS,
} from './settingsInstantPaintInteract';
import { resolveSettingsOverlayLayer } from './settingsInstantPaintDom';
import { suppressSettingsReopen } from './settingsInstantPaintReopen';
import { armHubLayerEnter, clearHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { SETTINGS_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';

export {
    clearSettingsReopenSuppress,
    isSettingsReopenSuppressed,
    SETTINGS_REOPEN_SUPPRESS_MS,
    suppressSettingsReopen,
} from './settingsInstantPaintReopen';
export { applySettingsOpaqueChrome } from './settingsInstantPaintChrome';
export { hasSettingsOverlayHost } from './settingsInstantPaintDom';
export {
    armSettingsOverlayInteraction,
    beginSettingsOpenGesture,
    disarmSettingsOverlayInteraction,
    isSettingsCloseGuarded,
    isSettingsOpenGestureBlockingClose,
    isSettingsOverlayInteractionArmed,
    scheduleSettingsOverlayInteractionArm,
    SETTINGS_INTERACT_ARM_MS,
} from './settingsInstantPaintInteract';

let forceVisible = false;
/** ساعة كشف الطبقة في الـ DOM — قبل التزام React بـ open=true */
let revealedAtMs: number | null = null;

export function isSettingsForceVisible(): boolean {
    return forceVisible;
}

/** React open أو كشف DOM الفوري (force / html snap) */
export function isSettingsLayerOpen(reactOpen: boolean): boolean {
    return reactOpen || forceVisible || isSettingsShellSnappedOpen();
}

export function clearSettingsForceVisible(): void {
    forceVisible = false;
}

/** لحظة كشف الطبقة (DOM) — لساعة مهلة الإغلاق دون انتظار إطار React */
export function getSettingsShellRevealedAt(): number | null {
    return revealedAtMs;
}

function restoreSettingsTriggerFocus(): void {
    if (typeof document === 'undefined') return;
    const trigger = document.querySelector(SETTINGS_GEAR_TRIGGER_SELECTOR);
    if (!(trigger instanceof HTMLElement)) return;
    trigger.focus({ preventScroll: true });
}

/** قبل aria-hidden/inert — يمنع تحذير «descendant retained focus» على زر الإغلاق */
function releaseSettingsOverlayFocus(root: HTMLElement): boolean {
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const hadFocusInside = active instanceof HTMLElement && root.contains(active);
    blurFocusWithin(root);
    return hadFocusInside;
}

function applyLayerVisible(
    root: HTMLElement,
    visible: boolean,
    options: { restoreTrigger?: boolean } = {},
): void {
    if (visible) {
        root.style.setProperty('visibility', 'visible');
        root.style.setProperty('pointer-events', 'auto');
        root.style.setProperty('opacity', '1');
        root.style.setProperty('background-color', SETTINGS_INSTANT_CHROME);
        root.classList.add('hami-settings-overlay-layer--visible');
        root.setAttribute('data-open', 'true');
        root.removeAttribute('aria-hidden');
        root.removeAttribute('inert');
        revealedAtMs =
            typeof performance !== 'undefined' ? performance.now() : Date.now();
        applySettingsThemeChrome(true);
        return;
    }

    resetSettingsOverlayInteractionState();
    const hadFocusInside = releaseSettingsOverlayFocus(root);
    root.style.setProperty('visibility', 'hidden');
    root.style.setProperty('pointer-events', 'none');
    root.style.setProperty('opacity', '0');
    root.classList.remove('hami-settings-overlay-layer--visible');
    root.classList.remove(SETTINGS_OVERLAY_INTERACT_CLASS);
    root.setAttribute('data-open', 'false');
    root.setAttribute('aria-hidden', 'true');
    root.setAttribute('inert', '');
    revealedAtMs = null;
    applySettingsThemeChrome(false);
    if (options.restoreTrigger && hadFocusInside) {
        restoreSettingsTriggerFocus();
    }
}

let chromeHandoffRaf = 0;

function cancelChromeHandoff(): void {
    if (!chromeHandoffRaf || typeof window === 'undefined') return;
    window.cancelAnimationFrame(chromeHandoffRaf);
    chromeHandoffRaf = 0;
}

/**
 * الجسر طلاء فقط. إن بقي فوق الـ Host يمنع اللمس (كان z-index فلكي + pointer-events:auto).
 * يُزال فور وجود الطبقة الحقيقية — لا حد 120 إطاراً يتركه معلّقاً.
 */
export function dismissSettingsInstantBridgeIfHostReady(): boolean {
    if (typeof document === 'undefined') return false;
    const host = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
    if (!(host instanceof HTMLElement)) return false;
    const wasArmed = !isSettingsCloseGuarded();
    applyLayerVisible(host, true);
    removeSettingsInstantBridge();
    if (wasArmed) {
        armSettingsOverlayInteraction(host);
    }
    return true;
}

function scheduleSettingsChromeHandoff(): void {
    if (typeof window === 'undefined') return;
    cancelChromeHandoff();
    let ticks = 0;

    const tick = () => {
        chromeHandoffRaf = 0;
        if (!forceVisible) {
            removeSettingsInstantBridge();
            return;
        }
        if (dismissSettingsInstantBridgeIfHostReady()) return;
        if (++ticks > 120) {
            removeSettingsInstantBridge();
            const host = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
            if (host instanceof HTMLElement) {
                applyLayerVisible(host, true);
                armSettingsOverlayInteraction(host);
            }
            return;
        }
        chromeHandoffRaf = window.requestAnimationFrame(tick);
    };

    chromeHandoffRaf = window.requestAnimationFrame(tick);
}

/** إزالة جسر الكروم الفوري بعد تسليم Host الحقيقي */
export function removeSettingsInstantBridge(): void {
    cancelChromeHandoff();
    detachSettingsInstantBridge();
}

/**
 * طلاء فوري في لمسة الترس:
 * Host موجود → كشف الطبقة الحقيقية كوحدة واحدة.
 * وإلا جسر كروم حتى يُركَّب Host — بلا إعادة تخطيط offsetHeight.
 */
export function paintSettingsInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    setSettingsCloseGuard(true);
    snapSettingsShellOpen();
    forceVisible = true;
    applySettingsThemeChrome(true);
    armHubLayerEnter(SETTINGS_HUB_LAYER, () => {
        const host = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
        return host instanceof HTMLElement ? host : null;
    });

    const existingHost = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
    if (existingHost instanceof HTMLElement) {
        cancelChromeHandoff();
        removeSettingsInstantBridge();
        applyLayerVisible(existingHost, true);
        scheduleSettingsOverlayInteractionArm(existingHost);
        return true;
    }

    ensureSettingsInstantChromeBridge();
    scheduleSettingsOverlayInteractionArm();
    scheduleSettingsChromeHandoff();
    return true;
}

export type ConcealSettingsWarmShellOptions = {
    /**
     * كبح إعادة الفتح بعد إغلاق مستخدم حقيقي فقط.
     * الافتراضي false — وإلا priming (تركيب host مغلق) يبتلع click فتح الترس في نفس الإيماءة.
     */
    suppressReopen?: boolean;
};

/** إخفاء فوري للطبقة الدافئة (بدون كبح فتح افتراضياً) */
export function concealSettingsWarmShell(
    options: ConcealSettingsWarmShellOptions = {},
): void {
    forceVisible = false;
    cancelChromeHandoff();
    clearHubLayerEnter(SETTINGS_HUB_LAYER);
    snapSettingsShellClose();
    if (options.suppressReopen) {
        suppressSettingsReopen();
    }
    const root = resolveSettingsOverlayLayer();
    if (root) applyLayerVisible(root, false, { restoreTrigger: options.suppressReopen === true });
    else {
        resetSettingsOverlayInteractionState();
        revealedAtMs = null;
        applySettingsThemeChrome(false);
    }
    removeSettingsInstantBridge();
}
