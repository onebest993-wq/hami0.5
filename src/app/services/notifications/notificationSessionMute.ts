import type { AppSettingsState } from '@/app/services/settings/types';
import {
    type NotificationSettings,
    normalizeNotificationSettings,
} from '@/app/services/settings/notificationSettings';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

/** إعدادات إشعارات مُطبّعة — سطح خفيف لكتم الجلسة دون سحب سياسة التنبيه الكاملة */
export function getNotificationSettings(
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): NotificationSettings {
    return normalizeNotificationSettings(settings.notifications);
}

export function isSessionMuted(settings?: AppSettingsState, now = Date.now()): boolean {
    const n = getNotificationSettings(settings);
    return typeof n.sessionMutedUntil === 'number' && now < n.sessionMutedUntil;
}
