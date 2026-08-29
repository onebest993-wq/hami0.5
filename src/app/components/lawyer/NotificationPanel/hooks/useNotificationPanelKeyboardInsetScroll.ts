import { useEffect, type RefObject } from 'react';
import { scrollNotificationPanelFocusedFieldIntoView } from '@/app/components/lawyer/NotificationPanel/utils/notificationPanelKeyboardLayout';

/** يمرّر الحقل النشط داخل اللوحة عند ارتفاع لوحة المفاتيح (موبايل فقط). */
export function useNotificationPanelKeyboardInsetScroll(
    panelRef: RefObject<HTMLDivElement | null>,
    isOpen: boolean,
    isDesktop: boolean,
    keyboardInset: number,
): void {
    useEffect(() => {
        if (!isOpen || isDesktop || keyboardInset <= 0) return;
        const id = window.requestAnimationFrame(() => {
            scrollNotificationPanelFocusedFieldIntoView(panelRef.current);
        });
        return () => window.cancelAnimationFrame(id);
    }, [isOpen, isDesktop, keyboardInset]);
}
