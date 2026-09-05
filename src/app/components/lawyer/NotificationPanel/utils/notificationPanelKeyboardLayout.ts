import type { CSSProperties } from 'react';

/**
 * يرفع ورقة الإشعارات فوق لوحة المفاتيح ويقلّص max-height (موبايل فقط).
 * على سطح المكتب/اللوحي العريض لا نلمس الهامش — اللوحة عائمة جانبياً.
 */
export function resolveNotificationPanelSheetStyle(
    keyboardInset: number,
    isDesktop: boolean,
): CSSProperties {
    if (isDesktop || keyboardInset <= 0) return {};
    const kb = Math.max(0, Math.round(keyboardInset));
    return {
        marginBottom: kb,
        maxHeight: `min(92dvh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - ${kb}px))`,
    };
}

/** يمرّر الحقل النشط داخل منطقة تمرير الورقة فقط — بلا تمرير أسلاف الصفحة. */
export function scrollNotificationPanelFocusedFieldIntoView(panelRoot: HTMLElement | null): void {
    if (!panelRoot || typeof document === 'undefined') return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    if (!panelRoot.contains(active)) return;
    if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && active.tagName !== 'SELECT') {
        return;
    }
    const scroller = panelRoot.querySelector('.hami-notif-scroll');
    if (!(scroller instanceof HTMLElement)) return;
    const activeRect = active.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    const delta =
        activeRect.top - scrollerRect.top - scroller.clientHeight / 2 + activeRect.height / 2;
    scroller.scrollTop += delta;
}
