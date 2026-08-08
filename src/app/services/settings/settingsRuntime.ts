import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

import type { AppSettingsState } from './types';

import { isWithinQuietHours, shouldAllowPush } from './apply';

import { BUILTIN_AUTO_SUMMARY } from './builtInBehavior';

import {
    getLawyerSettingsSnapshot,
    invalidateLawyerSettingsCache,
    publishLawyerSettingsLive,
} from './settingsSnapshot';

import {
    alertNotificationChannel,
    filterAlertsByNotificationPolicy,
    pushOptionsForChannel,
    shouldShowChannelInApp,
    shouldSendOsPush,
    getNotificationSettings,
    type NotificationChannelKey,
} from '@/app/services/notifications/notificationAlertPolicy';

export type { AppSettingsState };
export {
    getLawyerSettingsSnapshot,
    invalidateLawyerSettingsCache,
    publishLawyerSettingsLive,
};

export type { NotificationChannelKey };

export { alertNotificationChannel };

export function isNotificationChannelAllowed(
    channel: NotificationChannelKey | null,
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): boolean {
    if (!channel) return false;
    return shouldShowChannelInApp(channel, settings);
}

export function filterAlertsByNotificationSettings(
    alerts: SecretaryAlert[],
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): SecretaryAlert[] {
    void BUILTIN_AUTO_SUMMARY;
    return filterAlertsByNotificationPolicy(alerts, settings);
}

export function canSendPushNotifications(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    const n = getNotificationSettings(settings);
    if (!n.masterEnabled) return false;
    return shouldAllowPush(settings);
}

export function isCloudSyncBucketEnabled(
    settings: AppSettingsState,
    bucket: 'notes' | 'files' | 'execution',
): boolean {
    if (settings.security.localOnlyMode) return false;
    if (!settings.data.cloudSync) return false;
    if (bucket === 'notes') return settings.data.syncNotes;
    if (bucket === 'files') return settings.data.syncFiles;
    return settings.data.syncExecution;
}

export function isLocalAutoSaveEnabled(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    return settings.data.autoSave;
}

export function shouldPrefetchLawyerChunks(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    return settings.performance.prefetchScreens;
}

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
    settings: AppSettingsState,
    base: {
        title: string;
        body?: string;
        tag?: string;
        data?: Record<string, unknown>;
        requireInteraction?: boolean;
    },
    channel: NotificationChannelKey = 'secretary',
    critical = false,
) {
    if (!shouldSendOsPush(channel, settings, critical)) {
        return { ...base, silent: true, vibrate: undefined };
    }
    return pushOptionsForChannel(channel, settings, base, critical);
}

export function areInAppNotificationsEnabled(
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): boolean {
    const n = getNotificationSettings(settings);
    return n.masterEnabled;
}
