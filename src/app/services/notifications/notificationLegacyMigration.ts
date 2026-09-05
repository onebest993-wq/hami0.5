import SecureStoreService from '@/app/services/SecureStoreService';
import {
    clearLegacyPlaintextMirror,
    readSecureOrDrainLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import { NotificationRepository } from '@/app/infrastructure/NotificationRepository';
import {
    isActivityLogNotification,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import { isIncomingNotification } from '@/app/services/notificationIncomingFilter';
import { isNavigationNoiseNotification } from '@/app/services/notificationMessageFormat';

export const NOTIFICATION_LEGACY_PURGE_VERSION = 'v1';

const PURGE_FLAG_PREFIX = 'hami:notifications:legacy-purged:';

function purgeFlagKey(userId: string): string {
    return `${PURGE_FLAG_PREFIX}${userId}:${NOTIFICATION_LEGACY_PURGE_VERSION}`;
}

function stripLegacyActivityNotifications(list: NotificationModel[]): NotificationModel[] {
    return list.filter((n) => !isActivityLogNotification(n));
}

function stripNonIncomingNotifications(list: NotificationModel[]): NotificationModel[] {
    return list.filter(
        (n) => isIncomingNotification(n) && !isNavigationNoiseNotification(n),
    );
}

/** تنظيف blob KV من audit_log/deadline — مرة واحدة لكل مستخدم. */
export async function purgeLegacyNotificationsIfNeeded(userId: string): Promise<boolean> {
    if (!userId) return false;

    try {
        if (readSecureOrDrainLegacySync(purgeFlagKey(userId)) === '1') {
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
        clearLegacyPlaintextMirror(purgeFlagKey(userId));
    } catch {
        /* ignore */
    }

    return cleaned.length !== raw.length;
}
