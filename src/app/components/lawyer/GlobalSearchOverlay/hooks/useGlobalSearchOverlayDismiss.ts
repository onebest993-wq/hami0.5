import { useEffect } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

/** طيّ لوحة المفاتيح عند الإغلاق — يقلل استهلاك البطارية على الهاتف. */
export function blurActiveGlobalSearchField(): void {
    const active = document.activeElement;
    if (active instanceof HTMLElement && active.closest('[data-testid="global-search-overlay"]')) {
        active.blur();
    }
}

/**
 * إغلاق البحث من Escape وزر الرجوع — يُسجَّل على مستوى الـ Host فور الفتح
 * (قبل تحميل chunk المنطق) لمنع minimizeApp على أندرويد.
 */
export function useGlobalSearchOverlayDismiss(open: boolean, onClose: () => void): void {
    useEffect(() => {
        if (!open) return;

        const dismiss = () => {
            blurActiveGlobalSearchField();
            onClose();
        };

        const onKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopPropagation();
            dismiss();
        };

        window.addEventListener('keydown', onKey, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            dismiss();
            return true;
        });

        return () => {
            window.removeEventListener('keydown', onKey, true);
            unregisterNativeBack();
        };
    }, [open, onClose]);
}
