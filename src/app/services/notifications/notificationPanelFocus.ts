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

/** مهلة إعادة المحاولة حتى تظهر البطاقة (تحميل بارد / نافذة قائمة). */
export const NOTIFICATION_FOCUS_RETRY_MS = 2_000;

/** يمرّر ويُبرز البطاقة إن وُجدت في DOM — لا يُسقط المعرّف من الخارج. */
export function highlightNotificationCard(id: string): boolean {
    if (typeof document === 'undefined') return false;
    const el = document.querySelector(`[data-testid="notification-card-${CSS.escape(id)}"]`);
    if (!(el instanceof HTMLElement)) return false;
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    el.setAttribute('data-hami-notif-focus', 'true');
    window.setTimeout(() => el.removeAttribute('data-hami-notif-focus'), 2_400);
    return true;
}
