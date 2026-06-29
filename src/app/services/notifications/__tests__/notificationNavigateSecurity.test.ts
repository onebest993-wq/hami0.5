import { describe, expect, it } from 'vitest';
import {
    isNotificationNavTarget,
    sanitizeNotificationActionPayload,
} from '@/app/services/notifications/notificationNavigateSecurity';

describe('notificationNavigateSecurity', () => {
    it('يقبل المسارات المسموحة فقط', () => {
        expect(isNotificationNavTarget('community')).toBe(true);
        expect(isNotificationNavTarget('vault')).toBe(true);
        expect(isNotificationNavTarget('javascript:alert(1)')).toBe(false);
        expect(isNotificationNavTarget('profile')).toBe(false);
    });

    it('يُصفّر الحمولة ويحذف المفاتيح غير المسموحة', () => {
        const out = sanitizeNotificationActionPayload({
            postId: '  post-1  ',
            evil: '<script>',
            tab: 'x'.repeat(200),
            caseId: '42',
        });
        expect(out).toEqual({ postId: 'post-1', caseId: '42' });
        expect(out.evil).toBeUndefined();
        expect(out.tab).toBeUndefined();
    });

    it('يرفض الحمولة غير الكائنية', () => {
        expect(sanitizeNotificationActionPayload(null)).toEqual({});
        expect(sanitizeNotificationActionPayload('bad' as unknown as Record<string, unknown>)).toEqual({});
    });
});
