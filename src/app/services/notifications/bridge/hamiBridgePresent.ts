/**
 * عرض إشعار فوري (أصلي أو ويب) ومعاينة نظام التشغيل.
 */
import { debug } from '@/app/utils/debug';
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
    hashToNativeNotificationId,
    nativeChannelIdForKey,
} from '@/app/services/notifications/native/nativeNotificationChannels';
import type { NotificationChannelKey } from '@/app/services/settings/notificationSettings';
import {
    initializeHamiNotificationBridge,
    loadNativePlugin,
} from '@/app/services/notifications/bridge/hamiBridgeNativePlugin';
import {
    toCapacitorNotificationPayload,
    toCapacitorSchedule,
} from '@/app/services/notifications/bridge/hamiBridgeSchedule';

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

/**
 * إشعار نظام فوري بعد إيماءة المستخدم (زر تفعيل إشعارات الجهاز).
 * يتجاوز سياسة الهدوء حتى يرى المستخدم النتيجة في شريط النظام.
 */
export async function previewHamiOsNotification(): Promise<boolean> {
    await initializeHamiNotificationBridge();

    const title = 'حامي';
    const body = 'تم تفعيل إشعار النظام — هذه نغمة المشروع';
    const extra = { type: 'os-preview' };

    const plugin = await loadNativePlugin();
    if (plugin) {
        const stamp = Date.now();
        const item: NativeScheduledNotification = {
            id: hashToNativeNotificationId(`os-preview-${stamp}`),
            key: `os-preview-${stamp}`,
            title,
            body,
            channelId: nativeChannelIdForKey('secretary'),
            fireAt: new Date(stamp),
            silent: false,
            extra,
            immediate: true,
        };
        try {
            await plugin.schedule({ notifications: [toCapacitorNotificationPayload(item)] });
            return true;
        } catch (error) {
            debug.warn('[HamiNotificationBridge] OS preview native failed:', error);
        }
    }

    if (PushNotificationService.getPermission() !== 'granted') return false;
    try {
        await PushNotificationService.showNotification({
            title,
            body,
            tag: `os-preview-${Date.now()}`,
            silent: false,
            data: extra,
        });
        return true;
    } catch {
        return false;
    }
}
