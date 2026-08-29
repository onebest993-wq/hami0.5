import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchSecure = vi.fn();

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: { fetchSecure: (...a: unknown[]) => fetchSecure(...a) },
}));

import { SupabaseAdminRepository } from '../SupabaseAdminRepository';

const sample = {
    id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    email: 'a@b.c',
    fullName: 'محام',
    familyName: '',
    phone: '',
    governorate: '',
    lawyerBarRoom: '',
    role: 'lawyer' as const,
    status: 'active' as const,
    createdAt: '2020-01-01T00:00:00.000Z',
    freezeUntil: null,
    loginUntil: null,
    loginBlocked: false,
    isDeleted: false,
    verificationStatus: 'none' as const,
    publicVerifiedBadge: false,
};

describe('SupabaseAdminRepository — BFF only', () => {
    beforeEach(() => {
        fetchSecure.mockReset();
    });

    it('يجلب المستخدمين من /api/admin/users', async () => {
        fetchSecure.mockResolvedValueOnce({ ok: true, users: [sample], capped: false });
        const repo = new SupabaseAdminRepository();
        await expect(repo.fetchAllUsers()).resolves.toMatchObject([sample]);
        expect(fetchSecure).toHaveBeenCalledWith('/api/admin/users', { method: 'GET', cache: 'no-store' });
    });

    it('يمرّر capped من الخادم', async () => {
        fetchSecure.mockResolvedValueOnce({ ok: true, users: [sample], capped: true, total: 9, usersTotal: 12 });
        const repo = new SupabaseAdminRepository();
        await expect(repo.fetchDirectory()).resolves.toMatchObject({
            users: [sample],
            capped: true,
            matched: 9,
            usersTotal: 12,
        });
    });

    it('يمرّر بحث الدليل في عنوان الطلب', async () => {
        fetchSecure.mockResolvedValueOnce({ ok: true, users: [sample], capped: false, total: 1, usersTotal: 4 });
        const repo = new SupabaseAdminRepository();
        await repo.fetchDirectory(undefined, {
            q: 'علي',
            status: 'pending',
            role: 'lawyer',
            created: '24h',
            offset: 50,
            limit: 50,
            includeId: '',
        });
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/users?q=%D8%B9%D9%84%D9%8A&status=pending&role=lawyer&created=24h&offset=50',
            expect.objectContaining({ method: 'GET' }),
        );
    });

    it('يطهّر محارف التحكم من صفوف الدليل', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            users: [{ ...sample, fullName: 'محام\u0000', email: 'a@b.c\n' }],
            capped: false,
        });
        const repo = new SupabaseAdminRepository();
        const directory = await repo.fetchDirectory();
        expect(directory.users[0]?.fullName).toBe('محام');
        expect(directory.users[0]?.email).toBe('a@b.c');
    });

    it('يرفض ترقية admin من العميل قبل الشبكة', async () => {
        const repo = new SupabaseAdminRepository();
        await expect(repo.changeUserRole(sample.id, 'admin')).rejects.toThrow(/دور غير مسموح/);
        expect(fetchSecure).not.toHaveBeenCalled();
    });

    it('تجميد مؤقت عبر /api/admin/account', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            user: { ...sample, status: 'suspended', freezeUntil: '2026-08-28T00:00:00.000Z' },
        });
        const repo = new SupabaseAdminRepository();
        await expect(repo.freezeAccount(sample.id, 24)).resolves.toMatchObject({ status: 'suspended' });
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/account',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ action: 'freeze', targetUserId: sample.id, durationHours: 24 }),
            }),
        );
    });

    it('يضع علامة التوثيق العامة عبر /api/admin/account', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            user: { ...sample, publicVerifiedBadge: true },
        });
        const repo = new SupabaseAdminRepository();
        await expect(repo.setPublicVerifiedBadge(sample.id, true)).resolves.toMatchObject({
            publicVerifiedBadge: true,
        });
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/account',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ action: 'public_badge', targetUserId: sample.id, shown: true }),
            }),
        );
    });

    it('قفل الدخول عبر /api/admin/account', async () => {
        fetchSecure.mockResolvedValueOnce({
            ok: true,
            user: { ...sample, loginBlocked: true },
        });
        const repo = new SupabaseAdminRepository();
        await expect(repo.lockLogin(sample.id, 0)).resolves.toMatchObject({ loginBlocked: true });
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/account',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ action: 'lock_login', targetUserId: sample.id, durationHours: 0 }),
            }),
        );
    });

    it('لا يرسل كلمة السر في مسار خاطئ', async () => {
        fetchSecure.mockResolvedValueOnce({ ok: true, user: sample });
        const repo = new SupabaseAdminRepository();
        await repo.setUserPassword(sample.id, 'HamiLaw9x');
        const body = String(fetchSecure.mock.calls[0]?.[1]?.body ?? '');
        expect(body).toContain('set_password');
        expect(body).toContain('HamiLaw9x');
        expect(fetchSecure).toHaveBeenCalledWith('/api/admin/account', expect.anything());
    });

    it('يرسل إشعار نظام عبر /api/admin/notify', async () => {
        fetchSecure.mockResolvedValueOnce({ ok: true, sent: 2, failed: 0, capped: false });
        const repo = new SupabaseAdminRepository();
        await expect(
            repo.sendSystemNotice({
                scope: 'users',
                userIds: [sample.id],
                title: 'تنبيه',
                message: 'صيانة',
            }),
        ).resolves.toEqual({ sent: 2, failed: 0, capped: false });
        expect(fetchSecure).toHaveBeenCalledWith(
            '/api/admin/notify',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    scope: 'users',
                    userIds: [sample.id],
                    title: 'تنبيه',
                    message: 'صيانة',
                }),
            }),
        );
    });
});
