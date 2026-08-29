/** كشف/إخفاء طبقة المنتدى فوراً في الـ DOM — مستقل عن إطار React */

import {
    applyOverlayLayerVisible,
    applyOverlayThemeChrome,
    isOverlayThemeActive,
    type OverlayLayerVisibleClasses,
} from '@/app/runtime/overlayController';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { armHubLayerEnter, clearHubLayerEnter } from '@/app/runtime/overlayHubLayerMotion';
import { FORUM_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';

const HOST_SELECTOR = '[data-testid="forum-overlay-host"]';
const FORUM_THEME = {
    htmlAttr: 'data-hami-forum-open',
    themeColor: '#0A0F1C',
} as const;

const FORUM_LAYER_CLASSES: OverlayLayerVisibleClasses = {
    visible: ['hami-forum-overlay-layer--visible', 'hami-forum-overlay-layer--snap', 'pointer-events-auto'],
    hidden: ['pointer-events-none'],
};

function resolveLayer(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    const host = document.querySelector(HOST_SELECTOR);
    return host instanceof HTMLElement ? host : null;
}

function applyLayerVisible(root: HTMLElement, visible: boolean): void {
    applyOverlayLayerVisible(root, visible, FORUM_LAYER_CLASSES);
    root.hidden = !visible;
    root.setAttribute('data-forum-layer-open', visible ? '1' : '0');
    if (visible) {
        root.removeAttribute('inert');
    } else {
        blurFocusWithin(root);
        root.setAttribute('inert', '');
    }
    applyOverlayThemeChrome(FORUM_THEME, visible);
}

/** يخفّي ثيم اللوحة فوراً — قبل commit React */
export function applyForumOpaqueChrome(): void {
    applyOverlayThemeChrome(FORUM_THEME, true);
}

/** يكشف Host الدافئ إن وُجد؛ وإلا يضع علم html فقط */
export function paintForumInstantChrome(): boolean {
    if (typeof document === 'undefined') return false;
    const layer = resolveLayer();
    if (!layer) {
        applyForumOpaqueChrome();
        return false;
    }
    armHubLayerEnter(FORUM_HUB_LAYER, () => {
        const host = document.querySelector(HOST_SELECTOR);
        if (!(host instanceof HTMLElement) || host.hidden) return null;
        if (host.getAttribute('aria-hidden') === 'true') return null;
        return host;
    });
    applyLayerVisible(layer, true);
    return true;
}

export function concealForumWarmShell(): void {
    if (typeof document === 'undefined') return;
    clearHubLayerEnter(FORUM_HUB_LAYER);
    const layer = resolveLayer();
    if (layer) applyLayerVisible(layer, false);
    else applyOverlayThemeChrome(FORUM_THEME, false);
}

export function isForumShellPaintedOpen(): boolean {
    return isOverlayThemeActive(FORUM_THEME);
}
