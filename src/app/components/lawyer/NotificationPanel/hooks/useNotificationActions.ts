import { useCallback, type MouseEvent } from 'react';
import {
    deriveNotificationCategory,
    type NotificationModel,
} from '@/app/infrastructure/NotificationRepository';
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import {
    clampClientPhoneInput,
    normalizeClientPhoneInput,
} from '@/app/services/notifications/notificationClientRequestSecurity';
import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';

type MarkAsReadFn = (userId: string, notificationId: string) => Promise<void>;

export function useNotificationActions(
    userId: string,
    onClose: () => void,
    onNavigate: (path: string, payload: Record<string, unknown>) => void,
    markAsRead: MarkAsReadFn,
) {
    const handleTap = useCallback(
        async (notification: NotificationModel) => {
            if (!notification.isRead) await markAsRead(userId, notification.id);
            onClose();
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
                case 'ai':
                    if (payload.caseId) {
                        onNavigate('case_details', payload);
                    }
                    break;
                default:
                    break;
            }
            if (path && isNotificationNavTarget(path)) onNavigate(path, payload);
        },
        [markAsRead, onClose, onNavigate, userId],
    );

    const handleClientRequest = useCallback(async (e: MouseEvent, _notif: NotificationModel) => {
        e.stopPropagation();
        const clientPhoneRaw = await SmartDialog.prompt(
            'أدخل رقم هاتف الموكل (مثال: +9647800000000):',
            '',
        );
        if (!clientPhoneRaw) return;

        const clientPhone = normalizeClientPhoneInput(clampClientPhoneInput(clientPhoneRaw));
        if (!clientPhone) {
            SmartToast.error('رقم الهاتف غير صالح. استخدم صيغة عراقية مثل +9647800000000');
            return;
        }

        const message = 'أهلاً بك، يرجى إرسال صورة القيد أو سند الطابو لإكمال ملف دعواكم.';
        try {
            const data = await SecureAPIClient.fetchSecure<{ success?: boolean; error?: string }>(
                '/api/comms-dispatcher',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ to: clientPhone, message, channel: 'whatsapp' }),
                },
            );
            if (data.success) SmartToast.success('تم إرسال الطلب للموكل بنجاح (Simulation) ✅');
            else throw new Error(data.error);
        } catch {
            window.open(
                `https://wa.me/${clientPhone.replace('+', '')}?text=${encodeURIComponent(message)}`,
                '_blank',
            );
        }
    }, []);

    const handleScan = useCallback(
        (e: MouseEvent) => {
            e.stopPropagation();
            onClose();
            onNavigate('scan_document', {});
        },
        [onClose, onNavigate],
    );

    return { handleTap, handleClientRequest, handleScan };
}
