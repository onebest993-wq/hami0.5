import { describe, expect, it } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/notificationModel';
import {
    isAllowedFcmToken,
    sanitizeNotificationModelForPersist,
} from '@/app/services/notifications/notificationInboxSanitize';
import { mergeSanitizedNotificationActionPayload } from '@/app/services/notifications/notificationNavigateSecurity';

describe('notificationInboxSanitize', () => {
    it('يرفض رمز FCM القصير أو الذي يحمل HTML', () => {
        expect(isAllowedFcmToken('short')).toBe(false);
        expect(isAllowedFcmToken(`ok${'a'.repeat(30)}<script>`)).toBe(false);
        expect(isAllowedFcmToken(`d${'A'.repeat(40)}:APA91b-test.token`)).toBe(true);
    });

    it('يسقط سجلاً بمعرّف خطر ويُبقي الحمولة الخادمية', () => {
        expect(
            sanitizeNotificationModelForPersist({
                id: 'n"]xss',
                title: 'عنوان',
                message: 'نص',
                type: 'system_alert',
                isRead: false,
                createdAt: '2026-08-01T00:00:00.000Z',
            } as NotificationModel),
        ).toBeNull();

        const saved = sanitizeNotificationModelForPersist({
            id: 'sys_ok',
            title: 'عنوان',
            message: 'نص',
            type: 'system_alert',
            isRead: false,
            createdAt: '2026-08-01T00:00:00.000Z',
            actionPayload: {
                postId: 'javascript:alert(1)',
                dedupeKey: 'sys:1',
                appendedBy: 'server',
            },
        });
        expect(saved?.id).toBe('sys_ok');
        expect(saved?.actionPayload).toMatchObject({ dedupeKey: 'sys:1', appendedBy: 'server' });
        expect(saved?.actionPayload?.postId).toBeUndefined();
    });

    it('mergeSanitized يُبقي مفاتيح غير تنقّل', () => {
        expect(
            mergeSanitizedNotificationActionPayload({
                postId: 'p1',
                dedupeKey: 'k1',
                evil: 1,
            }),
        ).toEqual({ postId: 'p1', dedupeKey: 'k1' });
    });
});
