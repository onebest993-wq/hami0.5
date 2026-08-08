import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AppSettingsState } from '@/app/services/settings/types';
import {
    NOTIFICATION_CHANNEL_KEYS,
    type NotificationChannelKey,
    type NotificationChannelPrefs,
    type NotificationSettings,
    normalizeNotificationSettings,
    NOTIFICATION_SETTINGS_DEFAULTS,
} from '@/app/services/settings/notificationSettings';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';

const PREFS_CACHE_KEY = 'hami:notification-prefs-cache:v1';

export type { NotificationChannelKey, NotificationChannelPrefs, NotificationSettings };

export function getNotificationSettings(
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): NotificationSettings {
    return normalizeNotificationSettings(settings.notifications);
}

export function isSessionMuted(settings?: AppSettingsState, now = Date.now()): boolean {
    const n = getNotificationSettings(settings);
    return typeof n.sessionMutedUntil === 'number' && now < n.sessionMutedUntil;
}

function isWithinQuietHours(settings: AppSettingsState, now = new Date()): boolean {
    const q = getNotificationSettings(settings).quietHours;
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

export function shouldShowSecretaryAlerts(settings?: AppSettingsState): boolean {
    const s = settings ?? getLawyerSettingsSnapshot();
    const n = getNotificationSettings(s);
    if (!n.masterEnabled || !n.secretaryEnabled) return false;
    if (isSessionMuted(s)) return false;
    return channelPrefs(s, 'secretary').enabled;
}

export function shouldShowChannelInApp(
    channel: NotificationChannelKey,
    settings?: AppSettingsState,
    critical = false,
): boolean {
    const s = settings ?? getLawyerSettingsSnapshot();
    if (!baseAllowed(s, channel, critical)) return false;
    return channelPrefs(s, channel).inApp;
}

export function shouldPlayChannelSound(
    channel: NotificationChannelKey,
    settings?: AppSettingsState,
    critical = false,
): boolean {
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
    const s = settings ?? getLawyerSettingsSnapshot();
    const n = getNotificationSettings(s);
    if (!n.vibrateMaster) return false;
    if (!baseAllowed(s, channel, critical)) return false;
    return channelPrefs(s, channel).sound;
}

export function shouldSendOsPush(
    channel: NotificationChannelKey,
    settings?: AppSettingsState,
    critical = false,
): boolean {
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
        case 'client_requests':
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
        if (!channel) return false;
        const critical = alert.priority <= 1;
        if (!shouldShowChannelInApp(channel, settings, critical)) return false;
        if (quiet && !critical) return false;
        return true;
    });
}

export function cacheNotificationPrefsForBackground(settings: AppSettingsState): void {
    const payload = {
        at: Date.now(),
        notifications: getNotificationSettings(settings),
    };
    const json = JSON.stringify(payload);

    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(PREFS_CACHE_KEY, json);
        } catch {
            /* ignore */
        }
    }

    if (typeof caches !== 'undefined') {
        void caches.open('hami-notification-prefs-v1').then((cache) => {
            return cache.put(
                'https://hami.local/notification-prefs',
                new Response(json, { headers: { 'Content-Type': 'application/json' } }),
            );
        });
    }
}

export function readCachedNotificationPrefs(): NotificationSettings {
    if (typeof localStorage === 'undefined') return NOTIFICATION_SETTINGS_DEFAULTS;
    try {
        const raw = localStorage.getItem(PREFS_CACHE_KEY);
        if (!raw) return NOTIFICATION_SETTINGS_DEFAULTS;
        const parsed = JSON.parse(raw) as { notifications?: unknown };
        return normalizeNotificationSettings(parsed.notifications);
    } catch {
        return NOTIFICATION_SETTINGS_DEFAULTS;
    }
}

export function listNotificationChannels(): NotificationChannelKey[] {
    return [...NOTIFICATION_CHANNEL_KEYS];
}
