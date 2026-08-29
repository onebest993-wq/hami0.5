/** كشف/إخفاء المستودع فوراً في الـ DOM — مستقل عن إطار React */

import {
    applyOverlayLayerVisible,
    applyOverlayThemeChrome,
    isOverlayThemeActive,
    type OverlayLayerVisibleClasses,
} from '@/app/runtime/overlayController';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { armHubLayerEnter, clearHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { REPOSITORY_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';

const MODAL_SELECTOR = '[data-testid="smart-repository-modal"]';
const REPOSITORY_THEME = {
    htmlAttr: 'data-hami-repository-open',
    themeColor: '#0A0F1C',
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
    return modal instanceof HTMLElement ? modal : null;
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    applyOverlayLayerVisible(root, visible, REPOSITORY_LAYER_CLASSES);
    if (visible) {
        root.removeAttribute('inert');
    } else {
        blurFocusWithin(root);
        root.setAttribute('inert', '');
    }
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
    armHubLayerEnter(REPOSITORY_HUB_LAYER, () => {
        const modal = document.querySelector(MODAL_SELECTOR);
        if (!(modal instanceof HTMLElement)) return null;
        if (modal.getAttribute('aria-hidden') === 'true') return null;
        return modal;
    });
    applyLayerVisible(layer, true);
    return true;
}

/** إخفاء فوري للطبقة الدافئة */
export function concealRepositoryWarmShell(): void {
    if (typeof document === 'undefined') return;
    clearHubLayerEnter(REPOSITORY_HUB_LAYER);
    const layer = resolveLayer();
    if (layer) applyLayerVisible(layer, false);
    else applyOverlayThemeChrome(REPOSITORY_THEME, false);
}

export function isRepositoryShellPaintedOpen(): boolean {
    return isOverlayThemeActive(REPOSITORY_THEME);
}
