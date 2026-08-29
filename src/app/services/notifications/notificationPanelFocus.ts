import { sanitizeNotificationFocusId } from '@/app/services/notifications/notificationNavigateSecurity';

/**
 * تركيز إشعار بعد النقر على المنبثق — يقرأه الـ panel عند الفتح.
 */
const FOCUS_KEY = 'hami:notification-focus-id:v1';

export function stashNotificationPanelFocusId(id: string): void {
    const safe = sanitizeNotificationFocusId(id);
    if (!safe || typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.setItem(FOCUS_KEY, safe);
    } catch {
        /* ignore */
    }
}

export function consumeNotificationPanelFocusId(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(FOCUS_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(FOCUS_KEY);
        return sanitizeNotificationFocusId(raw);
    } catch {
        return null;
    }
}
