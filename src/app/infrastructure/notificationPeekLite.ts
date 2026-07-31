/**
 * قراءة إشعارات محلية sync — بلا NotificationRepository / SecureAPI / شبكة.
 */
import SecureStoreService from '@/app/services/SecureStoreService';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';

const LOCAL_KEY_PREFIX = 'hami:notifications:v1:';

function getLocalKey(userId: string): string {
    return `${LOCAL_KEY_PREFIX}${userId}`;
}

/** قراءة sync من التخزين المحلي — عرض فوري قبل اكتمال الجلب الشبكي */
export function peekLocalNotifications(userId: string): NotificationModel[] {
    try {
        const raw = SecureStoreService.getItemSync(getLocalKey(userId));
        if (raw) {
            const parsed: unknown = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed as NotificationModel[];
        }
    } catch {
        /* ignore */
    }
    return [];
}

/** عدّاد غير المقروء بلا zustand / NotificationRepository — لشارة الهيدر عند أول paint */
export function peekNotificationUnreadCount(userId: string | null | undefined): number {
    const uid = userId?.trim();
    if (!uid) return 0;
    try {
        return peekLocalNotifications(uid).filter((n) => !n.isRead).length;
    } catch {
        return 0;
    }
}
