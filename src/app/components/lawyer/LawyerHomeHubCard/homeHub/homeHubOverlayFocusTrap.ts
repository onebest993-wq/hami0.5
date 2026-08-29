import type { KeyboardEvent } from 'react';

export function queryHomeHubOverlayFocusable(sheet: HTMLElement): HTMLElement[] {
    return Array.from(
        sheet.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
    ).filter((el) => {
        if (el.getAttribute('aria-hidden') === 'true') return false;
        if (el.tabIndex === -1) return false;
        const href = el.getAttribute('href');
        if (href && /^\s*(javascript|data|vbscript):/i.test(href)) return false;
        return true;
    });
}

export function trapHomeHubOverlayTabKey(
    event: KeyboardEvent<HTMLDivElement>,
    sheet: HTMLElement | null,
): void {
    if (event.key !== 'Tab' || !sheet) return;
    const focusable = queryHomeHubOverlayFocusable(sheet);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
        return;
    }
    if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}
