import { beforeEach, describe, expect, it, vi } from 'vitest';

const appendMock = vi.fn();

vi.mock('@/app/services/notifications/notificationServerBlob', () => ({
    appendIncomingNotificationServer: (...a: unknown[]) => appendMock(...a),
}));

import { notifyHeadquartersAccountStatus, notifyHeadquartersForumStatus } from '../headquartersAccountNotify.ts';

describe('notifyHeadquartersAccountStatus', () => {
    beforeEach(() => {
        appendMock.mockReset();
        appendMock.mockResolvedValue({ id: 'n1' });
    });

    it('يرسل إشعار نظام لصاحب الحساب عند التجميد المؤقت', async () => {
        const until = new Date(Date.now() + 24 * 3600_000).toISOString();
        await notifyHeadquartersAccountStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            kind: 'frozen',
            durationHours: 24,
            freezeUntil: until,
        });
        expect(appendMock).toHaveBeenCalledWith(
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            expect.objectContaining({
                title: 'تجميد الحساب',
                type: 'system_alert',
                category: 'system',
            }),
        );
        const payload = appendMock.mock.calls[0]?.[1] as { message?: string };
        expect(payload.message).toContain('حتى');
        expect(payload.message).toContain('الدعاوى');
        expect(payload.message).not.toContain('لن تتمكن من الدخول');
        expect(payload.message).not.toContain('الكل');
    });

    it('يرسل إشعار تفعيل دون بث للجميع', async () => {
        await notifyHeadquartersAccountStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            kind: 'unfrozen',
        });
        expect(appendMock).toHaveBeenCalledTimes(1);
        expect(appendMock.mock.calls[0]?.[0]).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
        const payload = appendMock.mock.calls[0]?.[1] as { title?: string; message?: string };
        expect(payload.title).toBe('تفعيل الحساب');
        expect(payload.message).toContain('المنتدى');
        expect(payload.message).not.toContain('تسجيل الدخول من جديد');
    });

    it('لا يرمي إن فشل صندوق الإشعارات', async () => {
        appendMock.mockRejectedValueOnce(new Error('kv down'));
        await expect(
            notifyHeadquartersAccountStatus({
                userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
                kind: 'frozen',
            }),
        ).resolves.toBeUndefined();
    });

    it('يرسل إشعار نظام عند حظر المنتدى دون مسح الأعمال', async () => {
        await notifyHeadquartersForumStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            kind: 'banned',
            reason: 'إساءة',
        });
        expect(appendMock).toHaveBeenCalledWith(
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            expect.objectContaining({
                title: 'حظر المنتدى',
                type: 'system_alert',
                category: 'system',
            }),
        );
        const payload = appendMock.mock.calls[0]?.[1] as { message?: string };
        expect(payload.message).toContain('المنتدى');
        expect(payload.message).toContain('لم تُمس');
    });

    it('يرسل إشعار قفل الدخول دون ادعاء مسح الدعاوى', async () => {
        await notifyHeadquartersAccountStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            kind: 'login_locked',
            durationHours: 24,
            loginUntil: new Date(Date.now() + 24 * 3600_000).toISOString(),
        });
        const payload = appendMock.mock.calls[0]?.[1] as { title?: string; message?: string };
        expect(payload.title).toBe('قفل الدخول');
        expect(payload.message).toContain('قفل الدخول');
        expect(payload.message).toContain('لم تُحذف');
    });

    it('كل تجميد يُنشئ إشعاراً جديداً ولا يُعاد استخدام المفتاح', async () => {
        await notifyHeadquartersAccountStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            kind: 'frozen',
        });
        await notifyHeadquartersAccountStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            kind: 'frozen',
        });
        const first = appendMock.mock.calls[0]?.[1] as { dedupeKey?: string };
        const second = appendMock.mock.calls[1]?.[1] as { dedupeKey?: string };
        expect(first.dedupeKey).toMatch(/^hq:account:frozen:/);
        expect(second.dedupeKey).toMatch(/^hq:account:frozen:/);
        expect(first.dedupeKey).not.toBe(second.dedupeKey);
    });

    it('يرسل إشعار توثيق لصاحب الحساب', async () => {
        const { notifyHeadquartersVerificationStatus } = await import('../headquartersAccountNotify.ts');
        await notifyHeadquartersVerificationStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            status: 'active',
        });
        expect(appendMock).toHaveBeenCalledWith(
            'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            expect.objectContaining({
                title: 'توثيق الحساب',
                category: 'system',
            }),
        );
    });

    it('يرسل إشعار رفض توثيق مع السبب', async () => {
        const { notifyHeadquartersVerificationStatus } = await import('../headquartersAccountNotify.ts');
        await notifyHeadquartersVerificationStatus({
            userId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
            status: 'rejected',
            rejectionReason: 'صورة الهوية غير واضحة',
        });
        const payload = appendMock.mock.calls[0]?.[1] as { title?: string; message?: string };
        expect(payload.title).toBe('رفض التوثيق');
        expect(payload.message).toContain('صورة الهوية غير واضحة');
    });
});
