import { useEffect } from 'react';

/**
 * عند إرسال التطبيق للخلفية: إخفاء لوحة المفاتيح وتجنّب focus عالق (iOS/Capacitor).
 * لا يُغلق الإعدادات — الحالة محفوظة عبر settingsSectionPersistence.
 */
export function useSettingsMobileSuspend(open: boolean): void {
    useEffect(() => {
        if (!open || typeof document === 'undefined') return;

        const onVisibility = () => {
            if (!document.hidden) return;
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
                active.blur();
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => document.removeEventListener('visibilitychange', onVisibility);
    }, [open]);
}
