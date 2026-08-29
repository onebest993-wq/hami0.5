import { armOverlayEnterSettle, clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';

export const HUB_LAYER_EXIT_MS = 140;
export const HUB_LAYER_EXIT_PAD_MS = 16;

export type HubLayerMotionSpec = {
    openAttr: string;
    closingAttr: string;
    enterAttr: string;
    layerSelector: string;
    chromeId?: string;
    exitMs?: number;
};

const exitGens = new Map<string, number>();

function bumpExit(closingAttr: string): number {
    const next = (exitGens.get(closingAttr) ?? 0) + 1;
    exitGens.set(closingAttr, next);
    return next;
}

export function shouldSkipHubLayerMotion(): boolean {
    if (typeof document === 'undefined') return true;
    const root = document.documentElement;
    if (
        root.dataset.hamiReduceMotion === '1' ||
        root.dataset.hamiAnimations === '0' ||
        root.dataset.hamiLite === '1'
    ) {
        return true;
    }
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

function isLiveLayer(el: Element): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false;
    if (el.classList.contains('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (el.hidden) return false;
    return true;
}

export function resolveHubMotionLayer(spec: HubLayerMotionSpec): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const nodes = document.querySelectorAll(spec.layerSelector);
    for (const node of nodes) {
        if (isLiveLayer(node)) return node;
    }
    if (spec.chromeId) {
        const chrome = document.getElementById(spec.chromeId);
        if (chrome instanceof HTMLElement) return chrome;
    }
    const fallback = document.querySelector(spec.layerSelector);
    return fallback instanceof HTMLElement ? fallback : null;
}

export function armHubLayerEnter(spec: HubLayerMotionSpec, ready?: () => Element | null): void {
    armOverlayEnterSettle(spec.enterAttr, ready ?? (() => resolveHubMotionLayer(spec)));
}

export function clearHubLayerEnter(spec: HubLayerMotionSpec): void {
    clearOverlayEnterSettle(spec.enterAttr);
}

export function clearHubLayerClosing(spec: HubLayerMotionSpec): void {
    bumpExit(spec.closingAttr);
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(spec.closingAttr);
}

/**
 * يُبقي الطبقة للخروج ثم onDone — لا يُخفِ React قبل اكتمال التلاشي.
 */
export function beginHubLayerExit(spec: HubLayerMotionSpec, onDone: () => void): void {
    const token = bumpExit(spec.closingAttr);
    if (typeof document === 'undefined' || shouldSkipHubLayerMotion()) {
        clearHubLayerEnter(spec);
        if (typeof document !== 'undefined') {
            document.documentElement.removeAttribute(spec.closingAttr);
        }
        onDone();
        return;
    }

    const motionEl = resolveHubMotionLayer(spec);
    if (!motionEl) {
        clearHubLayerEnter(spec);
        document.documentElement.removeAttribute(spec.closingAttr);
        onDone();
        return;
    }

    if (spec.chromeId) {
        const chrome = document.getElementById(spec.chromeId);
        if (chrome && chrome !== motionEl) chrome.remove();
    }

    const root = document.documentElement;
    clearHubLayerEnter(spec);
    root.setAttribute(spec.closingAttr, '1');
    root.removeAttribute(spec.openAttr);

    let settled = false;
    const finish = () => {
        if (settled || exitGens.get(spec.closingAttr) !== token) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        motionEl.removeEventListener('transitionend', onTransitionEnd);
        if (exitGens.get(spec.closingAttr) === token) {
            document.documentElement.removeAttribute(spec.closingAttr);
        }
        onDone();
    };

    const onTransitionEnd = (event: Event) => {
        if (!(event instanceof TransitionEvent)) return;
        if (event.propertyName !== 'opacity' && event.propertyName !== 'transform') return;
        finish();
    };

    motionEl.addEventListener('transitionend', onTransitionEnd);
    const fallbackTimer = window.setTimeout(
        finish,
        (spec.exitMs ?? HUB_LAYER_EXIT_MS) + HUB_LAYER_EXIT_PAD_MS,
    );
}
