import { describe, expect, it } from 'vitest';
import {
    clampClientPhoneInput,
    normalizeClientPhoneInput,
} from '@/app/services/notifications/notificationClientRequestSecurity';
import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';
import {
    isNotificationHeaderBusy,
    isNotificationPanelColdLoading,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationHeaderBusy';

describe('notificationClientRequestSecurity', () => {
    it('يقبل رقماً عراقياً صالحاً', () => {
        expect(normalizeClientPhoneInput('07800000000')).toBe('+9647800000000');
        expect(normalizeClientPhoneInput('+9647800000000')).toBe('+9647800000000');
    });

    it('يرفض رقماً غير صالح', () => {
        expect(normalizeClientPhoneInput('abc')).toBeNull();
        expect(normalizeClientPhoneInput('123')).toBeNull();
    });

    it('يحدّ طول الإدخال', () => {
        const long = '0'.repeat(40);
        expect(clampClientPhoneInput(long).length).toBeLessThanOrEqual(20);
    });
});

describe('notificationNavigateSecurity', () => {
    it('يسمح بمسارات معروفة فقط', () => {
        expect(isNotificationNavTarget('community')).toBe(true);
        expect(isNotificationNavTarget('evil')).toBe(false);
    });

    it('ينقّي حمولة التنقّل', () => {
        const out = sanitizeNotificationActionPayload({
            postId: 'p-1',
            evil: '<script>',
            fileId: 'x'.repeat(200),
        });
        expect(out).toEqual({ postId: 'p-1' });
        expect(out.evil).toBeUndefined();
    });
});

describe('notificationHeaderBusy', () => {
    it('لا يُظهر انشغال الرأس عند وجود بيانات مخزّنة', () => {
        expect(isNotificationHeaderBusy(true, true)).toBe(false);
        expect(isNotificationHeaderBusy(true, false)).toBe(true);
    });

    it('يُظهر تحميل القائمة فقط عند البرد الفعلي', () => {
        expect(isNotificationPanelColdLoading(true, 0, false)).toBe(true);
        expect(isNotificationPanelColdLoading(true, 0, false, true)).toBe(false);
        expect(isNotificationPanelColdLoading(true, 2, false)).toBe(false);
        expect(isNotificationPanelColdLoading(true, 0, true)).toBe(false);
    });
});
