import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { ThemeKey, ShapeKey } from '@/app/types/common';
import { migrateLawyerSettings } from './migrate';
import type { AppSettingsState } from './types';
import { isWithinQuietHours, shouldAllowPush } from './apply';

export type NotificationChannelKey = 'lawsuits' | 'execution' | 'calendar' | 'community' | 'financial';

let cached: AppSettingsState | null = null;
let cacheAt = 0;
let live: AppSettingsState | null = null;
let liveAt = 0;

function ensureRuntimeListener(): void {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { __hamiSettingsRuntimeInstalled?: boolean };
    if (w.__hamiSettingsRuntimeInstalled) return;
    w.__hamiSettingsRuntimeInstalled = true;
    window.addEventListener('hami:settings-updated', (evt) => {
        try {
            const next = (evt as CustomEvent).detail as unknown;
            if (!next || typeof next !== 'object') return;
            live = next as AppSettingsState;
            liveAt = Date.now();
            cached = live;
            cacheAt = liveAt;
        } catch {
            return;
        }
    });
}

export function invalidateLawyerSettingsCache(): void {
    cached = null;
    cacheAt = 0;
}

/** Sync read for services/hooks outside React (short TTL cache). */
export function getLawyerSettingsSnapshot(): AppSettingsState {
    ensureRuntimeListener();
    const now = Date.now();
    if (live && now - liveAt < 60_000) return live;
    if (cached && now - cacheAt < 400) return cached;
    const raw = persistenceRepository.load('lawyer_settings');
    const theme = persistenceRepository.load<ThemeKey>('lawyer_theme');
    const shape = persistenceRepository.load<ShapeKey>('lawyer_shape');
    cached = migrateLawyerSettings(raw, theme, shape);
    cacheAt = now;
    return cached;
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
            return 'lawsuits';
    }
}

export function isNotificationChannelAllowed(
    settings: AppSettingsState,
    channel: NotificationChannelKey | null,
): boolean {
    if (!settings.notifications.master) return false;
    if (channel === null) return true;
    return settings.notifications[channel];
}

export function filterAlertsByNotificationSettings(
    alerts: SecretaryAlert[],
    settings: AppSettingsState = getLawyerSettingsSnapshot(),
): SecretaryAlert[] {
    if (!settings.workflow.smartAlerts) return [];
    if (settings.security.decoyMode) return [];
    const base = alerts.filter((a) => isNotificationChannelAllowed(settings, alertNotificationChannel(a)));
    if (isWithinQuietHours(settings)) {
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

export function pushNotificationOptionsFromSettings(
    settings: AppSettingsState,
    base: { title: string; body?: string; tag?: string; data?: Record<string, unknown>; requireInteraction?: boolean },
) {
    return {
        ...base,
        silent: !settings.notifications.sound,
        vibrate: settings.notifications.vibrate ? [120, 60, 120] : undefined,
    };
}
