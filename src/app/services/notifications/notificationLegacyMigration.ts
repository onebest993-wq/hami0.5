import SecureStoreService from '@/app/services/SecureStoreService';
import { NotificationRepository } from '@/app/infrastructure/NotificationRepository';
import {
    isActivityLogNotification,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import { isIncomingNotification } from '@/app/services/notificationIncomingFilter';
import { isNavigationNoiseNotification } from '@/app/services/notificationMessageFormat';

export const NOTIFICATION_LEGACY_PURGE_VERSION = 'v1';

const PURGE_FLAG_PREFIX = 'hami:notifications:legacy-purged:';

/** أنواع legacy — للفلترة فقط (لا تُنشَر من المنتج). */
export const LEGACY_ACTIVITY_NOTIFICATION_TYPES = [
    'audit_log_civil',
    'audit_log_criminal',
    'audit_log_execution',
    'audit_log_task',
    'deadline',
] as const;

export type LegacyActivityNotificationType = (typeof LEGACY_ACTIVITY_NOTIFICATION_TYPES)[number];

function purgeFlagKey(userId: string): string {
    return `${PURGE_FLAG_PREFIX}${userId}:${NOTIFICATION_LEGACY_PURGE_VERSION}`;
}

export function stripLegacyActivityNotifications(list: NotificationModel[]): NotificationModel[] {
    return list.filter((n) => !isActivityLogNotification(n));
}

export function stripNonIncomingNotifications(list: NotificationModel[]): NotificationModel[] {
    return list.filter(
        (n) => isIncomingNotification(n) && !isNavigationNoiseNotification(n),
    );
}

/** تنظيف blob KV من audit_log/deadline — مرة واحدة لكل مستخدم. */
export async function purgeLegacyNotificationsIfNeeded(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
        if (SecureStoreService.getItemSync(purgeFlagKey(userId)) === '1') {
            return false;
        }
    } catch {
        /* continue */
    }

    const raw = await NotificationRepository.fetchNotifications(userId);
    const withoutLegacy = stripLegacyActivityNotifications(raw);
    const cleaned = stripNonIncomingNotifications(withoutLegacy);

    if (cleaned.length !== raw.length) {
        await NotificationRepository.replaceAllNotifications(userId, cleaned);
    }

    try {
        SecureStoreService.setItemSync(purgeFlagKey(userId), '1');
    } catch {
        /* ignore */
    }

    return cleaned.length !== raw.length;
}
