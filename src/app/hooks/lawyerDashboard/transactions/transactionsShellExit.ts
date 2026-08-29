import { clearOverlayEnterSettle } from '@/app/runtime/overlayEnterSettle';
import { TRANSACTIONS_INSTANT_CHROME_ID } from '@/app/services/transactions/transactionsShellSnap';

const CLOSING_ATTR = 'data-hami-transactions-closing';
const OPEN_ATTR = 'data-hami-transactions-open';
const HUB_SELECTOR = '[data-testid="transactions-hub"]';
const LAYER_SELECTOR = '.hami-tx-overlay-layer';

export const TRANSACTIONS_LAYER_EXIT_MS = 140;
export const TRANSACTIONS_LAYER_EXIT_PAD_MS = 16;

let exitGen = 0;

function shouldSkipTransactionsMotion(): boolean {
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

function isLiveTransactionsHub(el: Element): el is HTMLElement {
    if (!(el instanceof HTMLElement)) return false;
    if (el.classList.contains('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    return true;
}

function resolveTransactionsMotionLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const hubs = document.querySelectorAll(HUB_SELECTOR);
    for (const hub of hubs) {
        if (isLiveTransactionsHub(hub)) return hub;
    }
    const chrome = document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID);
    if (chrome instanceof HTMLElement) return chrome;
    const layer = document.querySelector(LAYER_SELECTOR);
    return layer instanceof HTMLElement ? layer : null;
}

export function clearTransactionsShellClosing(): void {
    exitGen += 1;
    if (typeof document === 'undefined') return;
    document.documentElement.removeAttribute(CLOSING_ATTR);
}

/**
 * يُبقي الطبقة للخروج ثم onDone — لا يُخفِ React قبل اكتمال التلاشي.
 */
export function beginTransactionsShellExit(onDone: () => void): void {
    const token = ++exitGen;
    if (typeof document === 'undefined' || shouldSkipTransactionsMotion()) {
        clearOverlayEnterSettle('data-hami-tx-enter');
        if (typeof document !== 'undefined') {
            document.documentElement.removeAttribute(CLOSING_ATTR);
        }
        onDone();
        return;
    }

    const motionEl = resolveTransactionsMotionLayer();
    if (!motionEl) {
        clearOverlayEnterSettle('data-hami-tx-enter');
        document.documentElement.removeAttribute(CLOSING_ATTR);
        onDone();
        return;
    }

    const chrome = document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID);
    if (chrome && chrome !== motionEl) chrome.remove();

    const root = document.documentElement;
    clearOverlayEnterSettle('data-hami-tx-enter');
    root.setAttribute(CLOSING_ATTR, '1');
    root.removeAttribute(OPEN_ATTR);

    let settled = false;
    const finish = () => {
        if (settled || token !== exitGen) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        motionEl.removeEventListener('transitionend', onTransitionEnd);
        if (token === exitGen) {
            document.documentElement.removeAttribute(CLOSING_ATTR);
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
        TRANSACTIONS_LAYER_EXIT_MS + TRANSACTIONS_LAYER_EXIT_PAD_MS,
    );
}
