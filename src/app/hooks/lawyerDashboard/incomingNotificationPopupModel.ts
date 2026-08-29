import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { shouldShowChannelInApp } from '@/app/services/notifications/notificationAlertPolicy';
import { notificationChannelFromModel } from '@/app/services/notifications/notificationChannelFromModel';
import { isNotificationInboxChannel } from '@/app/services/settings/notificationSettings';

export type IncomingNotificationPopup = {
    id: string;
    title: string;
    message: string;
    createdAt: string;
    channel?: ReturnType<typeof notificationChannelFromModel>;
};

export function toIncomingNotificationPopup(n: NotificationModel): IncomingNotificationPopup {
    return {
        id: n.id,
        title: n.title,
        message: n.message,
        createdAt: n.createdAt,
        channel: notificationChannelFromModel(n),
    };
}

export function isEligibleInAppPopup(n: NotificationModel): boolean {
    if (n.isRead) return false;
    const channel = notificationChannelFromModel(n);
    if (!isNotificationInboxChannel(channel)) return false;
    return shouldShowChannelInApp(channel);
}

export const INCOMING_POPUP_MAX_VISIBLE = 2;

export function mergeIncomingPopupQueue(
    prev: IncomingNotificationPopup[],
    fresh: NotificationModel[],
    maxVisible = INCOMING_POPUP_MAX_VISIBLE,
): IncomingNotificationPopup[] {
    const existing = new Set(prev.map((p) => p.id));
    const merged = [...prev];
    for (const n of fresh) {
        if (existing.has(n.id)) continue;
        merged.unshift(toIncomingNotificationPopup(n));
    }
    return merged.slice(0, maxVisible);
}
