/**
 * ربط نموذج الإشعار بقناة إعدادات التنبيه.
 */
import {
    deriveNotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/notificationModel';
import type { NotificationChannelKey } from '@/app/services/settings/notificationSettings';

export function notificationChannelFromModel(
    notification: Pick<NotificationModel, 'type' | 'category' | 'actionPayload'>,
): NotificationChannelKey {
    const cat = deriveNotificationCategory(notification as NotificationModel);
    switch (cat) {
        case 'forum':
            return 'community';
        case 'execution':
            return 'execution';
        case 'civil':
        case 'criminal':
            return 'lawsuits';
        case 'document':
            return 'secretary';
        case 'ai':
            return 'secretary';
        case 'system':
            return 'secretary';
        case 'task':
            return 'calendar';
        default:
            return 'secretary';
    }
}
