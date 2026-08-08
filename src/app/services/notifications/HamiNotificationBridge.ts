/**
 * جسر الإشعارات الموحّد — ويب + Capacitor أصلي
 */
import { debug } from '@/app/utils/debug';
import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';
import { whenNativeCapacitorBootComplete } from '@/app/runtime/nativeCapacitorBoot';
import {
    cacheNotificationPrefsForBackground,
    pushOptionsForChannel,
    shouldSendOsPush,
} from '@/app/services/notifications/notificationAlertPolicy';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import { PushNotificationService, type NotificationOptions } from '@/app/services/PushNotificationService';
import {
    buildImmediateNativeNotification,
    type NativeScheduledNotification,
} from '@/app/services/notifications/native/calendarNativeReminderScheduler';
import {
    HAMI_NATIVE_CHANNEL_IDS,
    HAMI_NATIVE_CHANNEL_META,
    nativeChannelLabelForKey,
} from '@/app/services/notifications/native/nativeNotificationChannels';
import {
    NOTIFICATION_CHANNEL_KEYS,
    type NotificationChannelKey,
} from '@/app/services/settings/notificationSettings';

export const HAMI_NATIVE_NOTIFICATION_RECEIVED_EVENT = 'hami:native-notification-received';

type LocalNotificationsPlugin = typeof import('@capacitor/local-notifications').LocalNotifications;

let nativePlugin: LocalNotificationsPlugin | null = null;
let nativeReady = false;
let listenersBound = false;
const scheduledIdByKey = new Map<string, number>();

async function loadNativePlugin(): Promise<LocalNotificationsPlugin | null> {
    if (!isCapacitorNativePlatform()) return null;
    if (nativePlugin) return nativePlugin;
    try {
        await whenNativeCapacitorBootComplete();
        const mod = await import('@capacitor/local-notifications');
        nativePlugin = mod.LocalNotifications;
        return nativePlugin;
    } catch (error) {
        debug.warn('[HamiNotificationBridge] native plugin unavailable:', error);
        return null;
    }
}

async function ensureNativeChannels(plugin: LocalNotificationsPlugin): Promise<void> {
    for (const key of NOTIFICATION_CHANNEL_KEYS) {
        const id = HAMI_NATIVE_CHANNEL_IDS[key];
        const meta = HAMI_NATIVE_CHANNEL_META[key];
        try {
            await plugin.createChannel({
                id,
                name: nativeChannelLabelForKey(key),
                description: meta.description,
                importance: meta.importance,
                visibility: 1,
                vibration: true,
                sound: 'default',
            });
        } catch {
            /* channel may exist */
        }
    }
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

export async function initializeHamiNotificationBridge(): Promise<void> {
    cacheNotificationPrefsForBackground(getLawyerSettingsSnapshot());

    const plugin = await loadNativePlugin();
    if (!plugin) {
        await PushNotificationService.initialize();
        return;
    }

    if (nativeReady) return;

    try {
        await ensureNativeChannels(plugin);
        bindNativeListeners(plugin);
        nativeReady = true;
        debug.log('[HamiNotificationBridge] native channels ready');
    } catch (error) {
        debug.warn('[HamiNotificationBridge] init failed:', error);
    }
}

export async function requestHamiNotificationPermission(options?: {
    fromUserGesture?: boolean;
}): Promise<'granted' | 'denied' | 'default'> {
    const plugin = await loadNativePlugin();
    if (plugin) {
        try {
            const result = await plugin.requestPermissions();
            const display = result.display;
            if (display === 'granted') return 'granted';
            if (display === 'denied') return 'denied';
            return 'default';
        } catch {
            return 'denied';
        }
    }
    return PushNotificationService.requestPermission(options);
}

function toCapacitorSchedule(items: NativeScheduledNotification[]) {
    return items.map((item) => ({
        id: item.id,
        title: item.title,
        body: item.body,
        channelId: item.channelId,
        schedule: { at: item.fireAt },
        sound: item.silent ? undefined : 'default',
        largeIcon: 'ic_launcher',
        extra: item.extra,
    }));
}

export async function syncNativeScheduledNotifications(
    items: NativeScheduledNotification[],
): Promise<void> {
    const plugin = await loadNativePlugin();
    if (!plugin) return;

    await initializeHamiNotificationBridge();

    const nextKeys = new Set(items.map((i) => i.key));
    const cancelIds: { id: number }[] = [];

    for (const [key, id] of scheduledIdByKey) {
        if (!nextKeys.has(key)) cancelIds.push({ id });
    }

    scheduledIdByKey.clear();
    for (const item of items) scheduledIdByKey.set(item.key, item.id);

    try {
        if (cancelIds.length > 0) {
            await plugin.cancel({ notifications: cancelIds });
        }
        if (items.length > 0) {
            await plugin.schedule({ notifications: toCapacitorSchedule(items) });
        }
    } catch (error) {
        debug.warn('[HamiNotificationBridge] schedule sync failed:', error);
    }
}

export async function showHamiNotification(
    channel: NotificationChannelKey,
    base: {
        title: string;
        body?: string;
        tag?: string;
        data?: Record<string, unknown>;
        requireInteraction?: boolean;
    },
    critical = false,
): Promise<void> {
    const settings = getLawyerSettingsSnapshot();
    cacheNotificationPrefsForBackground(settings);

    if (!shouldSendOsPush(channel, settings, critical)) return;

    const plugin = await loadNativePlugin();
    if (plugin) {
        const immediate = buildImmediateNativeNotification({
            key: base.tag ?? `${channel}-${Date.now()}`,
            channel,
            title: base.title,
            body: base.body ?? '',
            critical,
            extra: base.data,
        });
        if (!immediate) return;
        await initializeHamiNotificationBridge();
        try {
            await plugin.schedule({ notifications: toCapacitorSchedule([immediate]) });
        } catch (error) {
            debug.warn('[HamiNotificationBridge] immediate native failed:', error);
        }
        return;
    }

    const webOpts = pushOptionsForChannel(channel, settings, base, critical);
    await PushNotificationService.showNotification(webOpts as NotificationOptions);
}

export async function cancelAllNativeScheduledNotifications(): Promise<void> {
    const plugin = await loadNativePlugin();
    if (!plugin) return;
    try {
        const pending = await plugin.getPending();
        const ids = pending.notifications.map((n) => ({ id: n.id }));
        if (ids.length > 0) await plugin.cancel({ notifications: ids });
        scheduledIdByKey.clear();
    } catch {
        /* ignore */
    }
}
