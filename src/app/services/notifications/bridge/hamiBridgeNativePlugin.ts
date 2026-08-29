/**
 * تحميل ملحق LocalNotifications، القنوات، المستمعون، التهيئة والصلاحية.
 */
import { debug } from '@/app/utils/debug';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import {
    acquireLocalNotificationsPlugin,
    isLocalNotificationsTimingError,
} from '@/app/runtime/localNotificationsNative';
import { cacheNotificationPrefsForBackground } from '@/app/services/notifications/notificationAlertPolicy';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { PushNotificationService } from '@/app/services/PushNotificationService';
import {
    HAMI_NATIVE_CHANNEL_IDS,
    HAMI_NATIVE_CHANNEL_META,
    HAMI_NATIVE_LOCKSCREEN_VISIBILITY,
    nativeChannelLabelForKey,
    nativeChannelSoundForKey,
} from '@/app/services/notifications/native/nativeNotificationChannels';
import {
    HAMI_NATIVE_LOCKSCREEN_CHANNEL_GEN,
    HAMI_NATIVE_LOCKSCREEN_GEN_STORAGE_KEY,
    nativeHamiChannelIdsToDelete,
    parseNativeLockscreenChannelGen,
    shouldPurgeDeliveredHamiNotifications,
    shouldRebuildNativeLockscreenChannels,
} from '@/app/services/notifications/native/nativeChannelLockscreenMigrate';
import { NOTIFICATION_CHANNEL_KEYS } from '@/app/services/settings/notificationSettings';
import { HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT } from '@/app/services/notifications/notificationOsTapEvents';

type LocalNotificationsPlugin = typeof import('@capacitor/local-notifications').LocalNotifications;

let nativePlugin: LocalNotificationsPlugin | null = null;
let nativeReady = false;
let listenersBound = false;

export async function loadNativePlugin(): Promise<LocalNotificationsPlugin | null> {
    if (!isCapacitorNativePlatform()) return null;
    if (nativePlugin) return nativePlugin;
    try {
        nativePlugin = await acquireLocalNotificationsPlugin();
        return nativePlugin;
    } catch (error) {
        if (!isLocalNotificationsTimingError(error)) {
            debug.warn('[HamiNotificationBridge] native plugin unavailable:', error);
        }
        return null;
    }
}

function readStoredLockscreenGen(): number {
    try {
        if (typeof localStorage === 'undefined') return 0;
        return parseNativeLockscreenChannelGen(
            localStorage.getItem(HAMI_NATIVE_LOCKSCREEN_GEN_STORAGE_KEY),
        );
    } catch {
        return 0;
    }
}

function persistLockscreenGen(): void {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(
            HAMI_NATIVE_LOCKSCREEN_GEN_STORAGE_KEY,
            String(HAMI_NATIVE_LOCKSCREEN_CHANNEL_GEN),
        );
    } catch {
        /* private mode / quota */
    }
}

async function listExistingChannelIds(plugin: LocalNotificationsPlugin): Promise<string[]> {
    try {
        const listed = await plugin.listChannels();
        return (listed?.channels ?? [])
            .map((channel) => channel.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);
    } catch {
        return [];
    }
}

async function ensureNativeChannels(plugin: LocalNotificationsPlugin): Promise<void> {
    const existing = await listExistingChannelIds(plugin);
    const rebuild = shouldRebuildNativeLockscreenChannels(readStoredLockscreenGen());
    const toDelete = nativeHamiChannelIdsToDelete({
        existingIds: existing,
        rebuildLockscreen: rebuild,
    });

    for (const id of toDelete) {
        try {
            await plugin.deleteChannel({ id });
        } catch {
            /* قد لا تكون موجودة */
        }
    }

    if (shouldPurgeDeliveredHamiNotifications({ rebuildLockscreen: rebuild, existingIds: existing })) {
        try {
            await plugin.removeAllDeliveredNotifications();
        } catch {
            /* ignore */
        }
        try {
            const pending = await plugin.getPending();
            const ids = (pending?.notifications ?? [])
                .map((item) => item.id)
                .filter((id): id is number => typeof id === 'number');
            if (ids.length > 0) {
                await plugin.cancel({ notifications: ids.map((id) => ({ id })) });
            }
        } catch {
            /* ignore */
        }
    }

    for (const key of NOTIFICATION_CHANNEL_KEYS) {
        const id = HAMI_NATIVE_CHANNEL_IDS[key];
        const meta = HAMI_NATIVE_CHANNEL_META[key];
        try {
            await plugin.createChannel({
                id,
                name: nativeChannelLabelForKey(key),
                description: meta.description,
                importance: meta.importance,
                visibility: HAMI_NATIVE_LOCKSCREEN_VISIBILITY,
                vibration: true,
                sound: nativeChannelSoundForKey(key),
            });
        } catch {
            /* channel may exist */
        }
    }

    if (rebuild) persistLockscreenGen();
}

function bindNativeListeners(plugin: LocalNotificationsPlugin): void {
    if (listenersBound) return;
    listenersBound = true;

    void plugin.addListener('localNotificationReceived', (notification) => {
        window.dispatchEvent(
            new CustomEvent(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, { detail: notification }),
        );
    });

    void plugin.addListener('localNotificationActionPerformed', (action) => {
        window.dispatchEvent(
            new CustomEvent(HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT, {
                detail: action.notification,
            }),
        );
    });
}

export async function initializeHamiNotificationBridge(userId?: string | null): Promise<void> {
    cacheNotificationPrefsForBackground(getLawyerSettingsSnapshot());

    const plugin = await loadNativePlugin();
    if (!plugin) {
        await PushNotificationService.initialize();
        return;
    }

    if (nativeReady) {
        if (userId) {
            const { initializeHamiFcmBridge } = await import('@/app/services/notifications/hamiFcmBridge');
            void initializeHamiFcmBridge(userId);
        }
        return;
    }

    try {
        await ensureNativeChannels(plugin);
        bindNativeListeners(plugin);
        nativeReady = true;
        debug.log('[HamiNotificationBridge] native channels ready');
        if (userId) {
            const { initializeHamiFcmBridge } = await import('@/app/services/notifications/hamiFcmBridge');
            void initializeHamiFcmBridge(userId);
        }
    } catch (error) {
        debug.warn('[HamiNotificationBridge] init failed:', error);
    }
}

export async function requestHamiNotificationPermission(options?: {
    fromUserGesture?: boolean;
    userId?: string | null;
}): Promise<'granted' | 'denied' | 'default'> {
    const plugin = await loadNativePlugin();
    if (plugin) {
        try {
            const result = await plugin.requestPermissions();
            const display = result.display;
            const granted = display === 'granted';
            if (granted) {
                await initializeHamiNotificationBridge(options?.userId ?? null);
            }
            if (display === 'granted') return 'granted';
            if (display === 'denied') return 'denied';
            return 'default';
        } catch {
            return 'denied';
        }
    }
    const web = await PushNotificationService.requestPermission(options);
    return web;
}
