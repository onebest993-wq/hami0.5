/** كشف/إخفاء المستودع فوراً في الـ DOM — مستقل عن إطار React */

import {
    applyOverlayLayerVisible,
    applyOverlayThemeChrome,
    isOverlayThemeActive,
    type OverlayLayerVisibleClasses,
} from '@/app/runtime/overlayController';

const MODAL_SELECTOR = '[data-testid="smart-repository-modal"]';
const INSTANT_SELECTOR = '[data-testid="smart-repository-instant-shell"]';
const REPOSITORY_THEME = {
    htmlAttr: 'data-hami-repository-open',
    themeColor: '#050810',
} as const;

const REPOSITORY_LAYER_CLASSES: OverlayLayerVisibleClasses = {
    visible: [
        'hami-repository-overlay-layer--visible',
        'hami-repository-overlay-layer--snap',
        'pointer-events-auto',
    ],
    hidden: ['pointer-events-none'],
};

function resolveLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const modal = document.querySelector(MODAL_SELECTOR);
    if (modal instanceof HTMLElement) return modal;
    const instant = document.querySelector(INSTANT_SELECTOR);
    return instant instanceof HTMLElement ? instant : null;
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    applyOverlayLayerVisible(root, visible, REPOSITORY_LAYER_CLASSES);
    applyOverlayThemeChrome(REPOSITORY_THEME, visible);
}

/** يخفّي ثيم اللوحة فوراً — قبل commit React */
export function applyRepositoryOpaqueChrome(): void {
    applyOverlayThemeChrome(REPOSITORY_THEME, true);
}

/** يكشف Host الدافئ إن وُجد؛ وإلا يضع علم html فقط */
export function paintRepositoryInstantChrome(): boolean {
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
    if (typeof document === 'undefined') return;
    const layer = resolveLayer();
    if (layer) applyLayerVisible(layer, false);
    else applyOverlayThemeChrome(REPOSITORY_THEME, false);
}

export function isRepositoryShellPaintedOpen(): boolean {
    return isOverlayThemeActive(REPOSITORY_THEME);
}
