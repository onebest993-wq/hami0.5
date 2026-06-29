import { useEffect } from 'react';

/** عند إرسال التطبيق للخلفية: إخفاء لوحة المفاتيح — لا يُغلق اللوحة (الحالة في الـ store). */
export function useNotificationMobileSuspend(isOpen: boolean): void {
    useEffect(() => {
        if (!isOpen || typeof document === 'undefined') return;

        const onVisibility = () => {
            if (!document.hidden) return;
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
                active.blur();
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [isOpen]);
}
