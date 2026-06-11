import { describe, expect, it } from 'vitest';
import {
    formatAuditCaseReference,
    isNavigationNoiseNotification,
    sanitizeNotificationDisplayMessage,
    stripTechnicalTokensFromMessage,
} from '../notificationMessageFormat';

describe('notificationMessageFormat', () => {
    it('يستبدل UUID وحده برسالة عربية مختصرة', () => {
        const message = sanitizeNotificationDisplayMessage({
            title: 'تم تغيير حالة الدعوى',
            message: '75fa07c3-3cc5-4605-ba77-c6dd021a0b1f',
            category: 'criminal',
            type: 'audit_log_criminal',
        });
        expect(message).toBe('تم تغيير حالة الدعوى');
        expect(message).not.toMatch(/[0-9a-f-]{36}/i);
    });

    it('يستبعد إشعارات فتح الإضبارة من السجل', () => {
        expect(
            isNavigationNoiseNotification({
                title: 'فتح إضبارة جزائية',
                message: 'تم فتح الإضبارة',
                actionPayload: { module: 'criminal', entityId: 'x' },
            }),
        ).toBe(true);
    });

    it('يزيل UUID من وسط النص ويحافظ على الجزء العربي', () => {
        expect(
            stripTechnicalTokensFromMessage('أحمد — 75fa07c3-3cc5-4605-ba77-c6dd021a0b1f'),
        ).toBe('أحمد');
    });

    it('يرفض caseNo التقني ويستخدم بديلاً عربياً', () => {
        expect(
            formatAuditCaseReference({
                caseNo: '75fa07c3-3cc5-4605-ba77-c6dd021a0b1f',
                clientName: 'علي',
                fallback: 'إضبارة مفتوحة',
            }),
        ).toBe('علي');
    });

    it('يترجم كلمات إنجليزية شائعة في الرسالة', () => {
        expect(
            sanitizeNotificationDisplayMessage({
                title: 'تم تغيير حالة الدعوى',
                message: '50/2026 • active → paused',
                category: 'civil',
                type: 'audit_log_civil',
            }),
        ).toContain('نشطة');
        expect(
            sanitizeNotificationDisplayMessage({
                title: 'تم تغيير حالة الدعوى',
                message: '50/2026 • active → paused',
                category: 'civil',
                type: 'audit_log_civil',
            }),
        ).toContain('معلّقة');
    });
});
