import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';

const CLOSING_ATTR = 'data-hami-global-search-closing';
const OPEN_ATTR = 'data-hami-global-search-open';
const LAYER_SELECTOR = '.hami-gs-layer[data-search-open="true"], .hami-gs-layer';
const SHEET_SELECTOR = '.hami-gs-sheet';

export const GLOBAL_SEARCH_LAYER_EXIT_MS = 150;
export const GLOBAL_SEARCH_LAYER_EXIT_PAD_MS = 16;

function shouldSkipGlobalSearchMotion(): boolean {
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

export function clearGlobalSearchShellClosing(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
}

/**
 * يُبقي الطبقة للخروج ثم onDone — لا يُخفِ React قبل اكتمال التلاشي.
 */
export function beginGlobalSearchShellExit(onDone: () => void): void {
    if (typeof document === 'undefined' || shouldSkipGlobalSearchMotion()) {
        clearOverlayEnterSettle('data-hami-gs-enter');
        clearGlobalSearchShellClosing();
        onDone();
        return;
    }

    const layer = document.querySelector(LAYER_SELECTOR);
    if (!(layer instanceof HTMLElement)) {
        clearGlobalSearchShellClosing();
        onDone();
        return;
    }

    const root = document.documentElement;
    clearOverlayEnterSettle('data-hami-gs-enter');
    root.setAttribute(CLOSING_ATTR, '1');
    root.removeAttribute(OPEN_ATTR);

    const sheet = document.querySelector(SHEET_SELECTOR);
    const motionEl = sheet instanceof HTMLElement ? sheet : layer;

    let settled = false;
    const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        motionEl.removeEventListener('transitionend', onTransitionEnd);
        clearGlobalSearchShellClosing();
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
        GLOBAL_SEARCH_LAYER_EXIT_MS + GLOBAL_SEARCH_LAYER_EXIT_PAD_MS,
    );
}
