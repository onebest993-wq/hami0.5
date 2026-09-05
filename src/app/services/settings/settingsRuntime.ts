import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AppSettingsState } from './types';
import { shouldAllowPush } from './apply';
import { getLawyerSettingsSnapshot } from './settingsSnapshot';
import {
    filterAlertsByNotificationPolicy,
    shouldShowChannelInApp,
    getNotificationSettings,
    type NotificationChannelKey,
} from '@/app/services/notifications/notificationAlertPolicy';

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
    return filterAlertsByNotificationPolicy(alerts, settings);
}

export function canSendPushNotifications(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
    const n = getNotificationSettings(settings);
    if (!n.masterEnabled) return false;
    return shouldAllowPush(settings);
}

function shouldPrefetchLawyerChunks(settings: AppSettingsState = getLawyerSettingsSnapshot()): boolean {
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

export function areInAppNotificationsEnabled(
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): boolean {
    const n = getNotificationSettings(settings);
    return n.masterEnabled;
}
