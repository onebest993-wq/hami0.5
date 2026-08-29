import { beforeEach, describe, expect, it, vi } from 'vitest';

const unwrapMock = vi.fn();
const restrictionMock = vi.fn();
const isPlatformAdminMock = vi.fn();
const isBannedMock = vi.fn();

vi.mock('../../security/bffAuth.ts', () => ({
    requireWifeUser: vi.fn(),
    unwrapWifeUser: (...a: unknown[]) => unwrapMock(...a),
}));

vi.mock('../../security/wifeUserStatus.ts', () => ({
    getWifeUserRestrictionLive: (...a: unknown[]) => restrictionMock(...a),
}));

vi.mock('../../security/roleResolver.ts', () => ({
    isPlatformAdminUserId: (...a: unknown[]) => isPlatformAdminMock(...a),
}));

vi.mock('../../../services/forum/forumRepository.ts', () => ({
    ForumRepository: {
        isBanned: (...a: unknown[]) => isBannedMock(...a),
    },
}));

import { GET } from './route.ts';

const USER = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

describe('GET /api/auth/account-gate', () => {
    beforeEach(() => {
        unwrapMock.mockReset();
        restrictionMock.mockReset();
        isPlatformAdminMock.mockReset();
        isBannedMock.mockReset();
        unwrapMock.mockReturnValue({ userId: USER });
        isPlatformAdminMock.mockResolvedValue(false);
        restrictionMock.mockResolvedValue({ loginAllowed: true, frozen: false, freezeUntil: null });
        isBannedMock.mockResolvedValue(null);
    });

    it('يعيد تجميد الحساب برسالة المنتدى', async () => {
        restrictionMock.mockResolvedValue({
            loginAllowed: true,
            frozen: true,
            freezeUntil: new Date(Date.now() + 60_000).toISOString(),
        });
        const res = await GET(new Request('https://app.test/api/auth/account-gate'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { frozen?: boolean; code?: string; message?: string };
        expect(body.frozen).toBe(true);
        expect(body.code).toBe('ACCOUNT_FROZEN');
        expect(body.message).toContain('تم تجميد حسابك');
        expect(isBannedMock).not.toHaveBeenCalled();
    });

    it('يعيد حظر المنتدى دون تجميد الحساب', async () => {
        isBannedMock.mockResolvedValue({ userId: USER });
        const res = await GET(new Request('https://app.test/api/auth/account-gate'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { frozen?: boolean; forumBanned?: boolean; code?: string };
        expect(body.frozen).toBe(false);
        expect(body.forumBanned).toBe(true);
        expect(body.code).toBe('FORUM_BANNED');
    });

    it('يعيد قفل الدخول قبل التجميد والمنتدى', async () => {
        restrictionMock.mockResolvedValue({
            loginAllowed: false,
            frozen: true,
            freezeUntil: null,
            loginUntil: new Date(Date.now() + 60_000).toISOString(),
            deleted: false,
        });
        const res = await GET(new Request('https://app.test/api/auth/account-gate'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { code?: string; loginAllowed?: boolean; message?: string };
        expect(body.code).toBe('ACCOUNT_LOCKED');
        expect(body.loginAllowed).toBe(false);
        expect(body.message).toContain('قفل الدخول');
        expect(isBannedMock).not.toHaveBeenCalled();
    });

    it('يعيد رسالة الحذف من الدليل لا رسالة القفل المؤقت', async () => {
        restrictionMock.mockResolvedValue({
            loginAllowed: false,
            frozen: false,
            freezeUntil: null,
            loginUntil: null,
            deleted: true,
        });
        const res = await GET(new Request('https://app.test/api/auth/account-gate'));
        expect(res.status).toBe(200);
        const body = (await res.json()) as { code?: string; message?: string };
        expect(body.code).toBe('ACCOUNT_LOCKED');
        expect(body.message).toContain('أُقفل الحساب');
        expect(body.message).toContain('أُخفي من الدليل');
    });
});
