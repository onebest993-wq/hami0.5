/**
 * طبقة مشتركة لطبقات الميزات الفورية — theme-color + إظهار/إخفاء DOM.
 * الإعدادات تحتفظ بمنطقها الخاص (bridge، كبح إعادة الفتح)؛ المستودع والمنتدى يستخدمان هذه الأساسيات.
 */

export type OverlayThemeChromeConfig = {
    htmlAttr: string;
    themeColor: string;
};

type ThemeChromeState = {
    prevThemeColor: string | null;
};

const themeStateByAttr = new Map<string, ThemeChromeState>();

function themeState(attr: string): ThemeChromeState {
    let state = themeStateByAttr.get(attr);
    if (!state) {
        state = { prevThemeColor: null };
        themeStateByAttr.set(attr, state);
    }
    return state;
}

export function applyOverlayThemeChrome(config: OverlayThemeChromeConfig, active: boolean): void {
    if (typeof document === 'undefined') return;
    const meta = document.querySelector('meta[name="theme-color"]');
    const state = themeState(config.htmlAttr);

    if (active) {
        if (meta && state.prevThemeColor === null) {
            state.prevThemeColor = meta.getAttribute('content');
        }
        meta?.setAttribute('content', config.themeColor);
        document.documentElement.setAttribute(config.htmlAttr, '1');
        return;
    }

    if (meta && state.prevThemeColor != null) {
        meta.setAttribute('content', state.prevThemeColor);
    }
    state.prevThemeColor = null;
    document.documentElement.removeAttribute(config.htmlAttr);
}

export function isOverlayThemeActive(config: OverlayThemeChromeConfig): boolean {
    if (typeof document === 'undefined') return false;
    return document.documentElement.getAttribute(config.htmlAttr) === '1';
}

export type OverlayLayerVisibleClasses = {
    visible: string[];
    hidden: string[];
};

export function applyOverlayLayerVisible(
    root: HTMLElement,
    visible: boolean,
    classes: OverlayLayerVisibleClasses,
): void {
    if (visible) {
        root.classList.add(...classes.visible);
        root.classList.remove(...classes.hidden);
        root.style.setProperty('opacity', '1');
        root.style.setProperty('visibility', 'visible');
        root.style.setProperty('pointer-events', 'auto');
        root.setAttribute('aria-hidden', 'false');
        return;
    }

    root.classList.remove(...classes.visible);
    root.classList.add(...classes.hidden);
    root.style.setProperty('opacity', '0');
    root.style.setProperty('visibility', 'hidden');
    root.style.setProperty('pointer-events', 'none');
    root.setAttribute('aria-hidden', 'true');
}

export {
    markOverlaySnapClosing,
    executeOverlaySnapClose,
    executeOverlayCoveredUnfreezeClose,
} from '@/app/runtime/overlaySnapClose';
