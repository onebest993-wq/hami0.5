import type { NotificationChannelKey } from '@/app/services/settings/notificationSettings';
import { NOTIFICATION_CHANNEL_LABELS } from '@/app/services/settings/notificationSettings';
import type { Importance } from '@capacitor/local-notifications';
import {
    HAMI_ARRIVAL_SOUND_FILE,
    HAMI_LEGAL_ALARM_SOUND_FILE,
} from '@/app/services/notifications/native/hamiNativeSound';

/**
 * معرّفات v3/v4 — أندرويد لا يغيّر visibility بعد إنشاء القناة.
 * القفل: VISIBILITY_PRIVATE يخفي نص القضية على شاشة القفل الآمنة.
 */
export const HAMI_NATIVE_CHANNEL_IDS: Record<NotificationChannelKey, string> = {
    lawsuits: 'hami-lawsuits-v3',
    execution: 'hami-execution-v3',
    calendar: 'hami-calendar-v4',
    community: 'hami-community-v3',
    financial: 'hami-financial-v3',
    secretary: 'hami-secretary-v3',
};

/** قنوات الإصدارات السابقة — تُحذف عند التهيئة حتى تُعاد بـ VISIBILITY_PRIVATE */
export const HAMI_NATIVE_CHANNEL_IDS_LEGACY = [
    'hami-lawsuits',
    'hami-lawsuits-v2',
    'hami-execution',
    'hami-execution-v2',
    'hami-calendar',
    'hami-calendar-v2',
    'hami-calendar-v3',
    'hami-community',
    'hami-community-v2',
    'hami-financial',
    'hami-financial-v2',
    'hami-secretary',
    'hami-secretary-v2',
] as const;

/** Android Notification.VISIBILITY_PRIVATE */
export const HAMI_NATIVE_LOCKSCREEN_VISIBILITY = 0;

const CURRENT_NATIVE_CHANNEL_IDS = Object.values(HAMI_NATIVE_CHANNEL_IDS);

/** قنوات hami-* على الجهاز التي لم تعد الجيل الحالي — تُحذف حتى لا يبقى نص PUBLIC على القفل */
export function staleHamiNotificationChannelIds(existingIds: readonly string[]): string[] {
    const current = new Set<string>(CURRENT_NATIVE_CHANNEL_IDS);
    return existingIds.filter((id) => id.startsWith('hami-') && !current.has(id));
}

export const HAMI_NATIVE_CHANNEL_META: Record<
    NotificationChannelKey,
    { importance: Importance; description: string }
> = {
    lawsuits: { importance: 4, description: 'تنبيهات الدعاوى والملفات القضائية' },
    execution: { importance: 4, description: 'تنبيهات ملفات التنفيذ' },
    calendar: { importance: 5, description: 'تذكير المواعيد والجلسات' },
    community: { importance: 4, description: 'نشاط المنتدى والردود' },
    financial: { importance: 4, description: 'المعاملات والخيوط المالية' },
    secretary: { importance: 4, description: 'تنبيهات النظام' },
};

export function nativeChannelIdForKey(key: NotificationChannelKey): string {
    return HAMI_NATIVE_CHANNEL_IDS[key];
}

export function nativeChannelLabelForKey(key: NotificationChannelKey): string {
    return NOTIFICATION_CHANNEL_LABELS[key];
}

/** صوت القناة — التقويم يستخدم منبّه حامي لا نغمة الوصول القصيرة */
export function nativeChannelSoundForKey(key: NotificationChannelKey): string {
    return key === 'calendar' ? HAMI_LEGAL_ALARM_SOUND_FILE : HAMI_ARRIVAL_SOUND_FILE;
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

export function calendarNativeSnoozeNotificationKey(eventId: string, untilMs: number): string {
    return `cal-snooze|${eventId}|${untilMs}`;
}
