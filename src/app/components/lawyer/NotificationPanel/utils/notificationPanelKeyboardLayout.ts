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

/** يمرّر الحقل النشط داخل منطقة التمرير عند فتح الكيبورد. */
export function scrollNotificationPanelFocusedFieldIntoView(panelRoot: HTMLElement | null): void {
    if (!panelRoot || typeof document === 'undefined') return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return;
    if (!panelRoot.contains(active)) return;
    if (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA' && active.tagName !== 'SELECT') {
        return;
    }
    try {
        active.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    } catch {
        active.scrollIntoView(true);
    }
}
