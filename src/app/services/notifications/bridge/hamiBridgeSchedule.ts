import { HAMI_NATIVE_CHANNEL_IDS, HAMI_NATIVE_LOCKSCREEN_VISIBILITY } from '@/app/services/notifications/native/nativeNotificationChannels';
import { sanitizeNotificationActionPayload } from '@/app/services/notifications/notificationNavigateSecurity';
import {
    HAMI_ARRIVAL_SOUND_FILE,
    HAMI_LEGAL_ALARM_SOUND_FILE,
} from '@/app/services/notifications/native/hamiNativeSound';
import type { NativeScheduledNotification } from '@/app/services/notifications/native/calendarNativeReminderScheduler';
import { debug } from '@/app/utils/debug';
import {
    initializeHamiNotificationBridge,
    loadNativePlugin,
} from '@/app/services/notifications/bridge/hamiBridgeNativePlugin';

const scheduledIdByKey = new Map<string, number>();

function soundForItem(item: NativeScheduledNotification): string | undefined {
    if (item.silent) return undefined;
    if (item.channelId === HAMI_NATIVE_CHANNEL_IDS.calendar) {
        return HAMI_LEGAL_ALARM_SOUND_FILE;
    }
    return HAMI_ARRIVAL_SOUND_FILE;
}

/** يحوّل جدولة داخلية إلى حمولة Capacitor. الفوري بلا `schedule` حتى لا يمرّ AlarmManager. */
export function toCapacitorNotificationPayload(item: NativeScheduledNotification) {
    const isCalendar = item.channelId === HAMI_NATIVE_CHANNEL_IDS.calendar;
    return {
        id: item.id,
        title: item.title,
        body: item.body,
        channelId: item.channelId,
        ...(item.immediate ? {} : { schedule: { at: item.fireAt, allowWhileIdle: true } }),
        sound: soundForItem(item),
        largeIcon: 'ic_launcher',
        extra: sanitizeNotificationActionPayload(item.extra),
        visibility: HAMI_NATIVE_LOCKSCREEN_VISIBILITY,
        ...(isCalendar ? { autoCancel: false } : {}),
    };
}

export function toCapacitorSchedule(items: NativeScheduledNotification[]) {
    return items.map(toCapacitorNotificationPayload);
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
