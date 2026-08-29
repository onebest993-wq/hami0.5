import { getHamiOverlayPortalRoot } from '@/app/utils/overlayPortal';
import {
    armOverlayEnterSettle,
    clearOverlayEnterSettle,
} from '@/app/runtime/overlayEnterSettle';
import {
    snapTransactionsShellOpen,
    TRANSACTIONS_INSTANT_CHROME_ID,
} from '@/app/services/transactions/transactionsShellSnap';

const HUB_SELECTOR = '[data-testid="transactions-hub"]';
const ENTER_ATTR = 'data-hami-tx-enter';

function getOverlayPortalRoot(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return getHamiOverlayPortalRoot({ id: 'hami-overlay-portal', zIndex: 229 });
}

export function removeTransactionsInstantChrome(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID)?.remove();
}

export function queryLiveTransactionsHub(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const hubs = document.querySelectorAll(HUB_SELECTOR);
    for (const hub of hubs) {
        if (!(hub instanceof HTMLElement)) continue;
        if (hub.classList.contains('hidden')) continue;
        if (hub.getAttribute('aria-hidden') === 'true') continue;
        return hub;
    }
    return null;
}

function ensureTransactionsInstantChromeBridge(): void {
    if (document.getElementById(TRANSACTIONS_INSTANT_CHROME_ID)) return;
    const portal = getOverlayPortalRoot();
    if (!portal) return;

    const bridge = document.createElement('div');
    bridge.id = TRANSACTIONS_INSTANT_CHROME_ID;
    bridge.setAttribute('data-testid', 'transactions-open-chrome');
    bridge.setAttribute('role', 'status');
    bridge.setAttribute('aria-busy', 'true');
    bridge.setAttribute('aria-label', 'إدارة المعاملات');
    bridge.setAttribute('dir', 'rtl');
    bridge.className =
        'hami-tx-overlay-layer pointer-events-auto fixed inset-0 z-[230] w-[100vw] max-w-[100vw] h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#0A0F1C]';
    bridge.innerHTML =
        '<div class="relative flex h-full min-h-[100dvh] w-full flex-col overflow-x-hidden bg-[#0A0F1C]" style="font-family:Tajawal,Cairo,sans-serif">' +
        '<header class="flex shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0A0F1C] px-4 py-2">' +
        '<div class="min-w-0 flex-1 text-center">' +
        '<h1 class="truncate text-[17px] font-semibold text-[#F4F4F5]" style="margin:0">إدارة المعاملات</h1>' +
        '</div></header>' +
        '<div class="mx-auto w-full max-w-[520px] flex-1 space-y-2 px-4 py-2">' +
        '<div class="h-11 bg-white/[0.03]"></div>' +
        '<div class="h-12 rounded-xl bg-white/[0.03]"></div>'.repeat(4) +
        '</div></div>';
    portal.appendChild(bridge);
}

/** طلاء فوري عند لمسة المعاملات — قبل انتظار chunk الطبقة */
export function paintTransactionsInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    snapTransactionsShellOpen();
    armOverlayEnterSettle(ENTER_ATTR, () => queryLiveTransactionsHub());
    if (document.querySelector(HUB_SELECTOR)) {
        removeTransactionsInstantChrome();
    } else {
        ensureTransactionsInstantChromeBridge();
    }
    return true;
}

export function clearTransactionsEnterSettle(): void {
    clearOverlayEnterSettle(ENTER_ATTR);
}
