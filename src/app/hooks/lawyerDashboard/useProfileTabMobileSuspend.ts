import { useEffect } from 'react';

/** عند إرسال التطبيق للخلفية: إخفاء لوحة المفاتيح أثناء تبويب الملف — الحالة تبقى في الـ tab. */
export function useProfileTabMobileSuspend(isActive: boolean): void {
    useEffect(() => {
        if (!isActive || typeof document === 'undefined') return;

        const onVisibility = () => {
            if (!document.hidden) return;
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
                active.blur();
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [isActive]);
}
