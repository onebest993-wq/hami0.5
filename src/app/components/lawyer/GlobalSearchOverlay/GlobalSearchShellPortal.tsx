import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * يرفع غلاف البحث إلى document.body — مثل Host الإعدادات.
 * يسمح بتجميد `[data-hami-lawyer-dashboard]` دون إخفاء الطبقة نفسها.
 */
export function GlobalSearchShellPortal({ children }: { children: ReactNode }) {
    const node = <div data-hami-global-search-shell="">{children}</div>;
    if (typeof document === 'undefined') return node;
    return createPortal(node, document.body);
}
