/** كشف/إخفاء مركز الإعدادات فوراً في الـ DOM — مستقل عن إطار React */

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
import {
    adoptSettingsOverlayHostNode,
    isSettingsOverlayHostSectionInteractive,
} from './settingsInstantPaintHostAdopt';
import { isSettingsReopenSuppressed, suppressSettingsReopen } from './settingsInstantPaintReopen';
import { armHubLayerEnter, clearHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { SETTINGS_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import {
    clearSettingsOverlayPresence,
    isSettingsForceVisible,
    isSettingsOverlayCssExiting,
    markSettingsOverlayRevealed,
} from './settingsOverlayPresence';

export {
    clearSettingsForceVisible,
    isSettingsForceVisible,
    isSettingsLayerOpen,
    isSettingsOverlayCssExiting,
} from './settingsOverlayPresence';
export {
    clearSettingsReopenSuppress,
    isSettingsReopenSuppressed,
    SETTINGS_REOPEN_SUPPRESS_MS,
    suppressSettingsReopen,
} from './settingsInstantPaintReopen';
export { applySettingsOpaqueChrome } from './settingsInstantPaintChrome';
export { hasSettingsOverlayHost } from './settingsInstantPaintDom';
export { isSettingsOverlayHostReactReady } from './settingsInstantPaintHostAdopt';
export {
    armSettingsOverlayInteraction,
    beginSettingsOpenGesture,
    disarmSettingsOverlayInteraction,
    isSettingsCloseGuarded,
    isSettingsOpenGestureBlockingClose,
    isSettingsOverlayInteractionArmed,
    scheduleSettingsOverlayInteractionArm,
    SETTINGS_GHOST_CLICK_SWALLOW_SELECTOR,
    SETTINGS_INTERACT_ARM_MS,
} from './settingsInstantPaintInteract';

/** ساعة كشف الطبقة في الـ DOM — قبل التزام React بـ open=true */
let revealedAtMs: number | null = null;

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
 * الجسر طلاء فقط داخل طبقة الـ overlay.
 * يُزال عندما يكون القسم الظاهر تفاعلياً — لا عند data-settings-root وحدها
 * (كانت تترك بطاقة فارغة أو شاشة كحلية بين التحميل والمحتوى).
 */
export function dismissSettingsInstantBridgeIfHostReady(): boolean {
    if (typeof document === 'undefined') return false;
    const host = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
    if (!(host instanceof HTMLElement) || !isSettingsOverlayHostSectionInteractive(host)) return false;
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
        if (!isSettingsForceVisible()) {
            removeSettingsInstantBridge();
            return;
        }
        if (dismissSettingsInstantBridgeIfHostReady()) return;
        if (++ticks > 120) {
            /* لا تُزل الجسر على قشرة فارغة — أبقِ الانتظار حتى القسم التفاعلي */
            if (dismissSettingsInstantBridgeIfHostReady()) return;
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
 * شجرة React جاهزة داخل الطبقة → كشفها.
 * وإلا قشرة داخل نفس عقدة الـ overlay حتى يلتزم Host.
 */
export function paintSettingsInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    if (isSettingsReopenSuppressed() || isSettingsOverlayCssExiting()) return false;
    setSettingsCloseGuard(true);
    markSettingsOverlayRevealed();
    applySettingsThemeChrome(true);
    const host = adoptSettingsOverlayHostNode();
    armHubLayerEnter(SETTINGS_HUB_LAYER, () => {
        const layer = document.querySelector(SETTINGS_OVERLAY_HOST_SELECTOR);
        return layer instanceof HTMLElement ? layer : null;
    });

    if (host && isSettingsOverlayHostSectionInteractive(host)) {
        cancelChromeHandoff();
        removeSettingsInstantBridge();
        applyLayerVisible(host, true);
        scheduleSettingsOverlayInteractionArm(host);
        return true;
    }

    ensureSettingsInstantChromeBridge();
    if (host) applyLayerVisible(host, true);
    scheduleSettingsOverlayInteractionArm(host ?? undefined);
    scheduleSettingsChromeHandoff();
    return true;
}

type ConcealSettingsWarmShellOptions = {
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
    clearSettingsOverlayPresence();
    cancelChromeHandoff();
    clearHubLayerEnter(SETTINGS_HUB_LAYER);
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
