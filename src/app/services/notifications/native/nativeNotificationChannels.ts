import type { NotificationChannelKey } from '@/app/services/settings/notificationSettings';
import { NOTIFICATION_CHANNEL_LABELS } from '@/app/services/settings/notificationSettings';

export const HAMI_NATIVE_CHANNEL_IDS: Record<NotificationChannelKey, string> = {
    lawsuits: 'hami-lawsuits',
    execution: 'hami-execution',
    calendar: 'hami-calendar',
    community: 'hami-community',
    financial: 'hami-financial',
    secretary: 'hami-secretary',
};

export const HAMI_NATIVE_CHANNEL_META: Record<
    NotificationChannelKey,
    { importance: number; description: string }
> = {
    lawsuits: { importance: 4, description: 'تنبيهات الدعاوى والملفات القضائية' },
    execution: { importance: 4, description: 'تنبيهات ملفات التنفيذ' },
    calendar: { importance: 5, description: 'تذكير المواعيد والجلسات' },
    community: { importance: 3, description: 'نشاط المنتدى والردود' },
    financial: { importance: 3, description: 'المعاملات والخيوط المالية' },
    secretary: { importance: 4, description: 'تنبيهات السكرتير الذكي' },
};

export function nativeChannelIdForKey(key: NotificationChannelKey): string {
    return HAMI_NATIVE_CHANNEL_IDS[key];
}

export function nativeChannelLabelForKey(key: NotificationChannelKey): string {
    return NOTIFICATION_CHANNEL_LABELS[key];
}

/** يحوّل مفتاح نصي إلى معرّف إشعار عددي ثابت لـ Capacitor */
export function hashToNativeNotificationId(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) {
        hash = (hash * 31 + key.charCodeAt(i)) | 0;
    }
    const positive = Math.abs(hash);
    return (positive % 2_000_000_000) + 1;
}

export function calendarNativeNotificationKey(
    eventId: string,
    date: string,
    time: string,
    minutesBefore: number,
): string {
    return `cal|${eventId}|${date}|${time}|${minutesBefore}`;
}
