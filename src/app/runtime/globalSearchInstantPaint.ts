/** كشف/إخفاء طبقة البحث — data-attributes؛ CSS للرؤية. بلا فتح حقل تحت الإصبع. */

import { snapGlobalSearchShellClose, snapGlobalSearchShellOpen } from '@/app/services/search/globalSearchShellSnap';
import {
    armOverlayEnterSettle,
    clearOverlayEnterSettle,
} from '@/app/runtime/overlayEnterSettle';
import { peekGlobalSearchDraftQuery, writeGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import { buildGlobalSearchInstantSheetInnerHtml } from '@/app/runtime/globalSearchInstantSheetHtml';

const WARM_SELECTOR = '[data-search-warm="true"]';
const SHELL_SELECTOR = '[data-hami-global-search-shell]';
const BRIDGE_ID = 'hami-gs-instant-bridge';
const DISMISS_LOCK_ATTR = 'data-hami-gs-dismiss-locked';
/** احتياط لإصبع معلّق — ليست مهلة فتح الحقل */
export const GLOBAL_SEARCH_DISMISS_UNLOCK_FALLBACK_MS = 700;
/** ~4 ثوانٍ بـ 60fps — Entry+Host كسولاً قد يتجاوزان 36 إطاراً (~600ms) */
export const GLOBAL_SEARCH_CHROME_HANDOFF_MAX_TICKS = 240;
export const GLOBAL_SEARCH_INSTANT_DISMISS_EVENT = 'hami-gs-instant-dismiss';

let dismissLockCleanup: (() => void) | null = null;
let chromeHandoffRaf = 0;

function resolveWarmLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const warm = document.querySelector(WARM_SELECTOR);
    if (warm instanceof HTMLElement && !warm.closest(`#${BRIDGE_ID}`)) return warm;
    const overlays = document.querySelectorAll(`${SHELL_SELECTOR} [data-testid="global-search-overlay"]`);
    for (const overlay of overlays) {
        if (overlay.closest(`#${BRIDGE_ID}`)) continue;
        if (overlay.parentElement instanceof HTMLElement) return overlay.parentElement;
    }
    return null;
}

/** يزيل inline reveal/conceal العالق — يمنع !important من حجب إعادة الفتح */
export function clearGlobalSearchLayerImperativeStyles(el: HTMLElement): void {
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.style.removeProperty('opacity');
}

export function isGlobalSearchDismissLocked(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.hasAttribute(DISMISS_LOCK_ATTR);
}

function setDismissLock(locked: boolean): void {
    if (typeof document === 'undefined') return;
    if (locked) document.documentElement.setAttribute(DISMISS_LOCK_ATTR, '1');
    else document.documentElement.removeAttribute(DISMISS_LOCK_ATTR);
}

function clearDismissLockSchedule(): void {
    if (!dismissLockCleanup) return;
    dismissLockCleanup();
    dismissLockCleanup = null;
}

function isGlobalSearchDismissSurface(target: EventTarget | null): boolean {
    if (!(target instanceof Element)) return false;
    return Boolean(
        target.closest('.hami-gs-backdrop') ||
            target.closest('#hami-gs-instant-bridge') ||
            target.closest('[aria-label="إغلاق البحث"]'),
    );
}

export function clearGlobalSearchDismissLock(): void {
    clearDismissLockSchedule();
    setDismissLock(false);
}

/**
 * الخلفية تغطي العدسة فور الطلاء — نفس الإصبع يغلق إن بقيت قابلة للنقر.
 * الفتح يبقى على click حتى لا يُركَّز حقل البحث تحت الإصبع (IME أندرويد).
 */
export function beginGlobalSearchDismissLock(): void {
    if (typeof document === 'undefined') return;
    setDismissLock(true);
    clearDismissLockSchedule();
    if (typeof window === 'undefined') return;

    let settled = false;
    const unlock = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', unlock, true);
        window.removeEventListener('click', onOpeningClick, true);
        window.clearTimeout(fallbackTimer);
        dismissLockCleanup = null;
        setDismissLock(false);
    };

    const onOpeningClick = (event: Event) => {
        if (isGlobalSearchDismissSurface(event.target)) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === 'function') {
                event.stopImmediatePropagation();
            }
        }
        unlock();
    };

    const onPointerEnd = () => {
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.addEventListener('click', onOpeningClick, true);
    };

    window.addEventListener('pointerup', onPointerEnd, true);
    window.addEventListener('pointercancel', unlock, true);
    const fallbackTimer = window.setTimeout(unlock, GLOBAL_SEARCH_DISMISS_UNLOCK_FALLBACK_MS);

    dismissLockCleanup = () => {
        settled = true;
        window.removeEventListener('pointerup', onPointerEnd, true);
        window.removeEventListener('pointercancel', unlock, true);
        window.removeEventListener('click', onOpeningClick, true);
        window.clearTimeout(fallbackTimer);
        dismissLockCleanup = null;
    };
}

/** كشف الطبقة الدافئة قبل commit React */
export function revealGlobalSearchWarmShell(): boolean {
    const root = resolveWarmLayer();
    if (!root) return false;
    clearGlobalSearchLayerImperativeStyles(root);
    root.setAttribute('data-search-open', 'true');
    root.removeAttribute('aria-hidden');
    root.removeAttribute('inert');
    return true;
}

/** إخفاء فوري عند الإغلاق مع الإبقاء على keepAlive — بلا inline !important */
export function concealGlobalSearchWarmShell(): void {
    clearGlobalSearchDismissLock();
    clearOverlayEnterSettle('data-hami-gs-enter');
    const root = resolveWarmLayer();
    if (root) {
        clearGlobalSearchLayerImperativeStyles(root);
        root.setAttribute('data-search-open', 'false');
        root.setAttribute('aria-hidden', 'true');
        root.setAttribute('inert', '');
    }
    removeGlobalSearchInstantBridge();
}

function cancelChromeHandoff(): void {
    if (!chromeHandoffRaf || typeof window === 'undefined') return;
    window.cancelAnimationFrame(chromeHandoffRaf);
    chromeHandoffRaf = 0;
}

export function removeGlobalSearchInstantBridge(): void {
    if (typeof document === 'undefined') return;
    cancelChromeHandoff();
    const bridge = document.getElementById(BRIDGE_ID);
    if (!(bridge instanceof HTMLElement)) return;
    bridge.remove();
}

function hostSheetCanTakeOver(host: HTMLElement): boolean {
    const sheet = host.querySelector('[data-testid="global-search-overlay"]');
    if (!(sheet instanceof HTMLElement)) return false;
    if (sheet.querySelector('[data-testid="global-search-input"], .hami-gs-header')) return true;
    return sheet.getBoundingClientRect().height > 8;
}

function completeGlobalSearchChromeHandoff(): void {
    if (typeof window === 'undefined') return;
    revealGlobalSearchWarmShell();
    const bridge = document.getElementById(BRIDGE_ID);
    if (bridge instanceof HTMLElement) {
        bridge.style.zIndex = '279';
    }
    chromeHandoffRaf = window.requestAnimationFrame(() => {
        chromeHandoffRaf = 0;
        removeGlobalSearchInstantBridge();
    });
}

function bindInstantBridgeInteractions(bridge: HTMLElement): void {
    const input = bridge.querySelector(
        '[data-testid="global-search-paint-input"], [data-testid="global-search-input"]',
    );
    if (input instanceof HTMLInputElement) {
        const seed = peekGlobalSearchDraftQuery();
        if (seed) input.value = seed;
        input.addEventListener('input', () => {
            writeGlobalSearchDraftQuery(input.value);
        });
    }

    bridge.addEventListener('click', (event) => {
        if (isGlobalSearchDismissLocked()) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const wantsClose = Boolean(
            target.closest('.hami-gs-backdrop') || target.closest('[data-testid="global-search-close"]'),
        );
        if (!wantsClose) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(GLOBAL_SEARCH_INSTANT_DISMISS_EVENT));
        }
        concealGlobalSearchWarmShell();
        snapGlobalSearchShellClose();
    });
}

function ensureGlobalSearchInstantBridge(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById(BRIDGE_ID);
    if (existing instanceof HTMLElement) return existing;

    const bridge = document.createElement('div');
    bridge.id = BRIDGE_ID;
    bridge.setAttribute('data-hami-global-search-shell', '');
    bridge.setAttribute('data-testid', 'global-search-instant-bridge');
    Object.assign(bridge.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483000',
        pointerEvents: 'auto',
    } as CSSStyleDeclaration);

    bridge.innerHTML = `
      <div class="hami-gs-layer" data-search-open="true" data-gs-paint="true">
        <button type="button" tabindex="-1" aria-hidden="true" class="hami-gs-backdrop"></button>
        <div class="hami-gs-sheet" role="dialog" aria-label="بحث شامل" data-testid="global-search-overlay">
          ${buildGlobalSearchInstantSheetInnerHtml()}
        </div>
      </div>
    `;
    bindInstantBridgeInteractions(bridge);
    document.body.appendChild(bridge);
    return bridge;
}

function scheduleGlobalSearchChromeHandoff(): void {
    if (typeof window === 'undefined') return;
    cancelChromeHandoff();
    let ticks = 0;

    const tick = () => {
        chromeHandoffRaf = 0;
        const host = resolveWarmLayer();
        if (host && hostSheetCanTakeOver(host)) {
            completeGlobalSearchChromeHandoff();
            return;
        }
        if (!document.getElementById(BRIDGE_ID)) return;
        if (document.documentElement.getAttribute('data-hami-global-search-open') !== '1') {
            removeGlobalSearchInstantBridge();
            return;
        }
        if (!host) {
            ensureGlobalSearchInstantBridge();
        }
        if (++ticks > GLOBAL_SEARCH_CHROME_HANDOFF_MAX_TICKS) {
            if (host) completeGlobalSearchChromeHandoff();
            return;
        }
        chromeHandoffRaf = window.requestAnimationFrame(tick);
    };

    chromeHandoffRaf = window.requestAnimationFrame(tick);
}

/**
 * طلاء في لمسة العدسة: Host دافئ → كشف الورقة. وإلا جسر بنفس الكروم
 * حتى لا تُرسم ستارة html::before وحدها (قفزة كحلي فارغة).
 */
export function paintGlobalSearchInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    snapGlobalSearchShellOpen();

    const warm = resolveWarmLayer();
    if (warm) {
        cancelChromeHandoff();
        removeGlobalSearchInstantBridge();
        revealGlobalSearchWarmShell();
        armOverlayEnterSettle(
            'data-hami-gs-enter',
            () => document.querySelector('.hami-gs-sheet'),
        );
        return true;
    }

    ensureGlobalSearchInstantBridge();
    armOverlayEnterSettle(
        'data-hami-gs-enter',
        () => document.querySelector('.hami-gs-sheet'),
    );
    scheduleGlobalSearchChromeHandoff();
    return true;
}
