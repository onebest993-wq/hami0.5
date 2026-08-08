import { clearGlobalSearchLayerImperativeStyles, concealGlobalSearchWarmShell } from '@/app/runtime/globalSearchInstantPaint';
import { concealNotificationWarmPanel } from '@/app/runtime/notificationInstantPaint';

function isVisiblyOpen(el: HTMLElement): boolean {
    if (el.getAttribute('data-search-open') === 'true') return true;
    if (el.getAttribute('data-open') === 'true') return true;
    const inlineVis = el.style.visibility;
    if (inlineVis === 'visible') return true;
    const computed = getComputedStyle(el);
    return computed.visibility !== 'hidden' && computed.opacity !== '0';
}

function forceConcealSearchLayer(el: HTMLElement): void {
    clearGlobalSearchLayerImperativeStyles(el);
    el.setAttribute('data-search-open', 'false');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
}

function forceConcealNotificationRoot(el: HTMLElement): void {
    el.style.removeProperty('opacity');
    el.style.removeProperty('visibility');
    el.style.removeProperty('pointer-events');
    el.classList.remove('hami-notif-layer--visible');
    el.classList.remove('hami-notif-layer--interact');
    el.setAttribute('data-open', 'false');
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('inert', '');
}

/**
 * يصلح طبقات overlay «الشبحية» — inline reveal بلا إغلاق React، أو العكس.
 * آمن للاستدعاء المتكرر؛ لا يمس الطبقات المفتوحة فعلاً (data-open / data-search-open).
 */
export function reconcileClosedOverlayLayers(): void {
    if (typeof document === 'undefined') return;

    document
        .querySelectorAll<HTMLElement>('.hami-gs-layer, [data-search-warm="true"]')
        .forEach((layer) => {
            if (layer.getAttribute('data-search-open') === 'true') return;
            if (!isVisiblyOpen(layer)) return;
            forceConcealSearchLayer(layer);
        });

    document.querySelectorAll<HTMLElement>('[data-notification-root]').forEach((root) => {
        if (root.getAttribute('data-open') === 'true') return;
        if (!isVisiblyOpen(root)) return;
        forceConcealNotificationRoot(root);
    });
}

/** إخفاء فوري لكل الطبقات الدافئة المغلقة — بعد الإقلاع أو إغلاق اللوحة */
export function sweepWarmOverlayLayersClosed(): void {
    concealGlobalSearchWarmShell();
    concealNotificationWarmPanel();
    reconcileClosedOverlayLayers();
}

let hygieneBound = false;

/** مراقبة خفيفة بعد أول تفاعل مع اللوحة */
export function bindOverlayLayerHygiene(): () => void {
    if (typeof window === 'undefined' || hygieneBound) return () => undefined;
    hygieneBound = true;

    const run = () => sweepWarmOverlayLayersClosed();

    window.addEventListener('hami:dashboard-interactive', run, { once: true });
    window.addEventListener('hami:boot-reveal-done', run, { once: true });

    if (document.querySelector('[data-testid="lawyer-dashboard-ready"]')) {
        queueMicrotask(run);
    }

    return () => {
        hygieneBound = false;
        window.removeEventListener('hami:dashboard-interactive', run);
        window.removeEventListener('hami:boot-reveal-done', run);
    };
}
