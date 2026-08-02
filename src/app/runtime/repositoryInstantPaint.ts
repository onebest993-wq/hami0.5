/** كشف/إخفاء المستودع فوراً في الـ DOM — مستقل عن إطار React */

const MODAL_SELECTOR = '[data-testid="smart-repository-modal"]';
const INSTANT_SELECTOR = '[data-testid="smart-repository-instant-shell"]';
const ATTR = 'data-hami-repository-open';
const CHROME = '#050810';

let prevThemeColor: string | null = null;
/** يمنع hover الدوك من إعادة طلاء html بعد الإغلاق */
let repositoryShellOpenCommitted = false;

export function markRepositoryShellOpenCommitted(open: boolean): void {
    repositoryShellOpenCommitted = open;
}

function resolveLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const modal = document.querySelector(MODAL_SELECTOR);
    if (modal instanceof HTMLElement) return modal;
    const instant = document.querySelector(INSTANT_SELECTOR);
    return instant instanceof HTMLElement ? instant : null;
}

function applyThemeChrome(active: boolean): void {
    if (typeof document === 'undefined') return;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (active) {
        if (meta && prevThemeColor === null) {
            prevThemeColor = meta.getAttribute('content');
        }
        meta?.setAttribute('content', CHROME);
        document.documentElement.setAttribute(ATTR, '1');
        return;
    }
    if (meta && prevThemeColor != null) {
        meta.setAttribute('content', prevThemeColor);
    }
    prevThemeColor = null;
    document.documentElement.removeAttribute(ATTR);
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    if (visible) {
        root.classList.add(
            'hami-repository-overlay-layer--visible',
            'hami-repository-overlay-layer--snap',
        );
        root.style.setProperty('opacity', '1');
        root.style.setProperty('visibility', 'visible');
        root.style.setProperty('pointer-events', 'auto');
        root.removeAttribute('aria-hidden');
        applyThemeChrome(true);
        return;
    }
    root.classList.remove('hami-repository-overlay-layer--visible');
    root.style.setProperty('opacity', '0');
    root.style.setProperty('visibility', 'hidden');
    root.style.setProperty('pointer-events', 'none');
    root.setAttribute('aria-hidden', 'true');
    applyThemeChrome(false);
}

/** يخفّي ثيم اللوحة فوراً — قبل commit React */
export function applyRepositoryOpaqueChrome(): void {
    if (!repositoryShellOpenCommitted) return;
    applyThemeChrome(true);
}

/** يكشف Host الدافئ إن وُجد؛ وإلا يضع علم html فقط */
export function paintRepositoryInstantChrome(): boolean {
    if (!repositoryShellOpenCommitted) return false;
    if (typeof document === 'undefined') return false;
    const layer = resolveLayer();
    if (!layer) {
        applyRepositoryOpaqueChrome();
        return false;
    }
    applyLayerVisible(layer, true);
    return true;
}

/** إخفاء فوري للطبقة الدافئة */
export function concealRepositoryWarmShell(): void {
    repositoryShellOpenCommitted = false;
    if (typeof document === 'undefined') return;
    const layer = resolveLayer();
    if (layer) applyLayerVisible(layer, false);
    else applyThemeChrome(false);
}

export function isRepositoryShellPaintedOpen(): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(ATTR) === '1';
}
