import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

import type { AppSettingsState } from './types';

import { isWithinQuietHours, shouldAllowPush } from './apply';

import {
    BUILTIN_AUTO_SUMMARY,
    BUILTIN_NOTIFICATION_SOUND,
    BUILTIN_NOTIFICATION_VIBRATE,
    BUILTIN_NOTIFICATIONS_ENABLED,
    BUILTIN_SMART_ALERTS,
} from './builtInBehavior';

import {
    getLawyerSettingsSnapshot,
    invalidateLawyerSettingsCache,
    publishLawyerSettingsLive,
} from './settingsSnapshot';

export type { AppSettingsState };
export {
    getLawyerSettingsSnapshot,
    invalidateLawyerSettingsCache,
    publishLawyerSettingsLive,
};

export type NotificationChannelKey = 'lawsuits' | 'execution' | 'calendar' | 'community' | 'financial';

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
            return 'lawsuits';
    }
}

export function isNotificationChannelAllowed(channel: NotificationChannelKey | null): boolean {
    void channel;
    return BUILTIN_NOTIFICATIONS_ENABLED;
}

export function filterAlertsByNotificationSettings(
    alerts: SecretaryAlert[],
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): SecretaryAlert[] {
    void settings;
    if (!BUILTIN_SMART_ALERTS) return [];
    const base = alerts.filter((a) => isNotificationChannelAllowed(alertNotificationChannel(a)));
    if (isWithinQuietHours()) {
        return base.filter((a) => a.priority <= 1);
    }
    return base;
}

export function canSendPushNotifications(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    return shouldAllowPush(settings);
}

export function isCloudSyncBucketEnabled(
    settings: AppSettingsState,
    bucket: 'notes' | 'files' | 'execution',
): boolean {
    if (settings.security.localOnlyMode) return false;
    if (!settings.data.cloudSync) return false;
    void bucket;
    return true;
}

export function isLocalAutoSaveEnabled(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    return settings.data.autoSave;
}

export function shouldPrefetchLawyerChunks(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    return settings.performance.prefetchScreens;
}

/** هل يُسمح بتسخين intent (hover/open) — يحترم prefetch و lite. */
export function shouldAllowIntentWarm(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    if (!shouldPrefetchLawyerChunks(settings)) return false;
    if (settings.performance.litePerformance === 'on') return false;
    if (typeof document !== 'undefined' && document.documentElement.dataset.hamiLite === '1') {
        return false;
    }
    return true;
}

export function isBuiltInAutoSummaryEnabled(): boolean {
    return BUILTIN_AUTO_SUMMARY;
}

export function pushNotificationOptionsFromSettings(
    _settings: AppSettingsState,
    base: {
        title: string;
        body?: string;
        tag?: string;
        data?: Record<string, unknown>;
        requireInteraction?: boolean;
    },
) {
    return {
        ...base,
        silent: !BUILTIN_NOTIFICATION_SOUND,
        vibrate: BUILTIN_NOTIFICATION_VIBRATE ? [120, 60, 120] : undefined,
    };
}

export function areInAppNotificationsEnabled(): boolean {
    return BUILTIN_NOTIFICATIONS_ENABLED;
}
