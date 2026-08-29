import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AppSettingsState } from '@/app/services/settings/types';
import {
    type NotificationChannelKey,
    type NotificationChannelPrefs,
    type NotificationSettings,
    isNotificationInboxChannel,
} from '@/app/services/settings/notificationSettings';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import {
    getNotificationSettings,
    isSessionMuted,
} from '@/app/services/notifications/notificationSessionMute';

const PREFS_CACHE_KEY = 'hami:notification-prefs-cache:v1';

export type { NotificationChannelKey, NotificationChannelPrefs, NotificationSettings };
export { getNotificationSettings, isSessionMuted };

/** سطح الإشعارات النشط: المنتدى + النظام (+ تقويم للتذكيرات الحرجة خارج اللوحة) */
function isActiveNotificationSurface(channel: NotificationChannelKey): boolean {
    return isNotificationInboxChannel(channel) || channel === 'calendar';
}

export function isWithinQuietHours(settings?: AppSettingsState, now = new Date()): boolean {
    const s = settings ?? getLawyerSettingsSnapshot();
    const q = getNotificationSettings(s).quietHours;
    if (!q.enabled) return false;
    const [sh, sm] = q.start.split(':').map(Number);
    const [eh, em] = q.end.split(':').map(Number);
    const mins = now.getHours() * 60 + now.getMinutes();
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    if (start <= end) return mins >= start && mins < end;
    return mins >= start || mins < end;
}

function channelPrefs(
    settings: AppSettingsState,
    channel: NotificationChannelKey,
): NotificationChannelPrefs {
    return getNotificationSettings(settings).channels[channel];
}

function baseAllowed(
    settings: AppSettingsState,
    channel: NotificationChannelKey,
    critical = false,
): boolean {
    const n = getNotificationSettings(settings);
    if (!n.masterEnabled) return false;
    if (isSessionMuted(settings)) return false;
    const ch = channelPrefs(settings, channel);
    if (!ch.enabled) return false;
    if (isWithinQuietHours(settings) && !critical) return false;
    return true;
}

function shouldShowSecretaryAlerts(settings?: AppSettingsState): boolean {
    const s = settings ?? getLawyerSettingsSnapshot();
    const n = getNotificationSettings(s);
    if (!n.masterEnabled) return false;
    if (isSessionMuted(s)) return false;
    return channelPrefs(s, 'secretary').enabled;
}

export function shouldShowChannelInApp(
    channel: NotificationChannelKey,
    settings?: AppSettingsState,
    critical = false,
): boolean {
    if (!isActiveNotificationSurface(channel)) return false;
    const s = settings ?? getLawyerSettingsSnapshot();
    if (!baseAllowed(s, channel, critical)) return false;
    return channelPrefs(s, channel).inApp;
}

export function shouldPlayChannelSound(
    channel: NotificationChannelKey,
    settings?: AppSettingsState,
    critical = false,
): boolean {
    if (!isActiveNotificationSurface(channel)) return false;
    const s = settings ?? getLawyerSettingsSnapshot();
    const n = getNotificationSettings(s);
    if (!n.soundMaster) return false;
    if (!baseAllowed(s, channel, critical)) return false;
    return channelPrefs(s, channel).sound;
}

export function shouldVibrateChannel(
    channel: NotificationChannelKey,
    settings?: AppSettingsState,
    critical = false,
): boolean {
    if (!isActiveNotificationSurface(channel)) return false;
    const s = settings ?? getLawyerSettingsSnapshot();
    const n = getNotificationSettings(s);
    if (!n.vibrateMaster) return false;
    if (!baseAllowed(s, channel, critical)) return false;
    /* الاهتزاز مستقل عن صوت القناة — يُحكم بـ vibrateMaster + تفعيل القناة */
    return channelPrefs(s, channel).enabled;
}

export function shouldSendOsPush(
    channel: NotificationChannelKey,
    settings?: AppSettingsState,
    critical = false,
): boolean {
    if (!isActiveNotificationSurface(channel)) return false;
    const s = settings ?? getLawyerSettingsSnapshot();
    if (!baseAllowed(s, channel, critical)) return false;
    return channelPrefs(s, channel).push;
}

export function shouldFireCalendarAlarm(settings?: AppSettingsState): boolean {
    return shouldShowChannelInApp('calendar', settings, true);
}

export function shouldPlayCalendarAlarmSound(settings?: AppSettingsState): boolean {
    return shouldPlayChannelSound('calendar', settings, true);
}

export function pushOptionsForChannel(
    channel: NotificationChannelKey,
    settings: AppSettingsState,
    base: {
        title: string;
        body?: string;
        tag?: string;
        data?: Record<string, unknown>;
        requireInteraction?: boolean;
    },
    critical = false,
) {
    const push = shouldSendOsPush(channel, settings, critical);
    const vibrate = shouldVibrateChannel(channel, settings, critical);
    return {
        ...base,
        silent: !push || !shouldPlayChannelSound(channel, settings, critical),
        vibrate: push && vibrate ? [180, 90, 180, 90, 320] : undefined,
    };
}

export function alertNotificationChannel(alert: SecretaryAlert): NotificationChannelKey | null {
    switch (alert.target) {
        case 'schedule':
            return 'calendar';
        case 'community':
            return 'community';
        case 'transactions':
        case 'threading':
            return 'financial';
        case 'execution':
            return 'execution';
        case 'lawsuit':
        case 'urgent':
            return 'lawsuits';
        case 'notepad':
            return null;
        default:
            return 'secretary';
    }
}

export function filterAlertsByNotificationPolicy(
    alerts: SecretaryAlert[],
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): SecretaryAlert[] {
    if (!shouldShowSecretaryAlerts(settings)) return [];

    const quiet = isWithinQuietHours(settings);
    return alerts.filter((alert) => {
        const channel = alertNotificationChannel(alert);
        if (!channel || !isNotificationInboxChannel(channel)) return false;
        const critical = alert.priority <= 1;
        if (!shouldShowChannelInApp(channel, settings, critical)) return false;
        if (quiet && !critical) return false;
        return true;
    });
}

export function cacheNotificationPrefsForBackground(_settings: AppSettingsState): void {
    /*
     * سابقاً: كتابة plaintext إلى localStorage + Cache API دون قارئ.
     * التفضيلات الحساسة تعيش أصلاً داخل `lawyer_settings` المشفّر.
     * هنا نمسح أي بقايا قديمة فقط — لا نعيد كتابة نص صريح على الجهاز.
     */
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(PREFS_CACHE_KEY);
        } catch {
            /* ignore */
        }
    }

    if (typeof caches !== 'undefined') {
        void caches.delete('hami-notification-prefs-v1').catch(() => undefined);
    }
}

