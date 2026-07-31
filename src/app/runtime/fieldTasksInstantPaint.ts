/** كشف/إخفاء ستارة الميدان فوراً في الـ DOM — مستقل عن إطار React */

const INSTANT_ROOT_ID = 'hami-field-tasks-instant-root';
const LAYER_SELECTOR = '[data-field-tasks-root]';

/** يبقى مفعّلاً حتى يلحق React بـ open=true — يمنع أي re-render من إعادة الإخفاء */
let forceVisible = false;

export function isFieldTasksForceVisible(): boolean {
    return forceVisible;
}

export function clearFieldTasksForceVisible(): void {
    forceVisible = false;
}

export function isFieldTasksInstantPaintActive(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(document.getElementById(INSTANT_ROOT_ID));
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    if (visible) {
        root.style.setProperty('opacity', '1');
        root.style.setProperty('visibility', 'visible');
        root.style.setProperty('pointer-events', 'auto');
        root.classList.add('hami-field-tasks-layer--visible', 'hami-field-tasks-layer--snap');
        root.setAttribute('data-open', 'true');
        root.removeAttribute('aria-hidden');
        root.removeAttribute('inert');
    } else {
        root.style.setProperty('opacity', '0');
        root.style.setProperty('visibility', 'hidden');
        root.style.setProperty('pointer-events', 'none');
        root.classList.remove('hami-field-tasks-layer--visible');
        root.setAttribute('data-open', 'false');
        root.setAttribute('aria-hidden', 'true');
        root.setAttribute('inert', '');
    }
    void root.offsetHeight;
}

/** كشف الستارة الدافئة فوراً (قبل أي setState) */
export function revealFieldTasksWarmSheet(): boolean {
    if (typeof document === 'undefined') return false;
    const root = document.querySelector(LAYER_SELECTOR);
    if (!(root instanceof HTMLElement)) return false;

    forceVisible = true;
    applyLayerVisible(root, true);
    clearFieldTasksInstantPaint();
    return true;
}

/** إخفاء فوري عند الإغلاق */
export function concealFieldTasksWarmSheet(): void {
    forceVisible = false;
    if (typeof document === 'undefined') return;
    const root = document.querySelector(LAYER_SELECTOR);
    if (root instanceof HTMLElement) applyLayerVisible(root, false);
    clearFieldTasksInstantPaint();
}

/** @deprecated الهيكل الفارغ لم يعد مسار الفتح — يبقى للتوافق البارد النادر */
export function paintFieldTasksInstantSheet(): void {
    if (typeof document === 'undefined') return;
    if (revealFieldTasksWarmSheet()) return;
}

export function clearFieldTasksInstantPaint(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(INSTANT_ROOT_ID)?.remove();
}
