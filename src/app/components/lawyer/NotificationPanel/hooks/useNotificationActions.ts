import { useCallback, type MouseEvent } from 'react';
import {
    deriveNotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';
import { requestOpenLawyerForum } from '@/app/runtime/forumOpenIntent';

type MarkAsReadFn = (userId: string, notificationId: string) => Promise<void>;

export function useNotificationActions(
    userId: string,
    onClose: () => void,
    onNavigate: (path: string, payload: Record<string, unknown>) => void,
    markAsRead: MarkAsReadFn,
) {
    const handleTap = useCallback(
        async (notification: NotificationModel) => {
            const cat = deriveNotificationCategory(notification);
            const payload = sanitizeNotificationActionPayload(notification.actionPayload ?? {});
            let path: string | null = null;
            switch (cat) {
                case 'forum':
                    path = 'community';
                    break;
                case 'document':
                    path = 'vault';
                    break;
                case 'execution':
                    path = payload.caseId ? 'case_details' : 'execution_home';
                    break;
                case 'civil':
                case 'criminal':
                    path = payload.caseId ? 'case_details' : 'lawsuit_home';
                    break;
                case 'task':
                    path = 'schedule';
                    break;
                case 'ai':
                    if (payload.caseId) path = 'case_details';
                    break;
                default:
                    break;
            }
            if (!notification.isRead) {
                void markAsRead(userId, notification.id).catch(() => undefined);
            }
            if (path === 'community') {
                const postId = typeof payload.postId === 'string' ? payload.postId : undefined;
                requestOpenLawyerForum(postId);
            } else if (path && isNotificationNavTarget(path)) onNavigate(path, payload);
            onClose();
        },
        [markAsRead, onClose, onNavigate, userId],
    );

    const handleScan = useCallback(
        (e: MouseEvent) => {
            e.stopPropagation();
            onClose();
            onNavigate('scan_document', {});
        },
        [onClose, onNavigate],
    );

    return { handleTap, handleScan };
}
