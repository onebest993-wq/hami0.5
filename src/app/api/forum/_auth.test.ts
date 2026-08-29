import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const requireWifeUserMock = vi.fn();
const canAccessLawyerForumUserIdMock = vi.fn();
const isForumModeratorUserIdMock = vi.fn();
const isPlatformAdminUserIdMock = vi.fn();
const isUserFrozenLiveMock = vi.fn();
const kvGetMock = vi.fn();

vi.mock('../security/bffAuth.ts', () => ({
    requireWifeUser: (...args: unknown[]) => requireWifeUserMock(...args),
}));

vi.mock('../security/wifeValidator.ts', () => ({
    extractUserTokenFromRequest: () => 'tok',
}));

vi.mock('../security/wifeSecurityMonitor.ts', () => ({
    recordWifeRejection: vi.fn(),
}));

vi.mock('../security/roleResolver.ts', () => ({
    canAccessLawyerForumUserId: (...args: unknown[]) => canAccessLawyerForumUserIdMock(...args),
    isForumModeratorUserId: (...args: unknown[]) => isForumModeratorUserIdMock(...args),
    isPlatformAdminUserId: (...args: unknown[]) => isPlatformAdminUserIdMock(...args),
}));

vi.mock('../security/wifeUserStatus.ts', () => ({
    isUserFrozenLive: (...args: unknown[]) => isUserFrozenLiveMock(...args),
}));

vi.mock('./adminAuth.ts', () => ({
    canManageForumAdmin: (...args: unknown[]) => isForumModeratorUserIdMock(...args),
}));

vi.mock('../security/kvStoreAdmin.ts', () => ({
    kvGet: (...args: unknown[]) => kvGetMock(...args),
}));

import {
    DEMO_GUEST_USER_ID,
    isDemoGuestUserId,
    requireForumAuth,
    requireForumAdminAuth,
    rejectDemoGuestForumWrite,
    forumCatchJsonResponse,
    FORUM_GENERIC_500,
} from './_auth.ts';
import { recordWifeRejection } from '../security/wifeSecurityMonitor.ts';

describe('forum _auth guest policy', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.restoreAllMocks();
        requireWifeUserMock.mockReset();
        canAccessLawyerForumUserIdMock.mockReset();
        isForumModeratorUserIdMock.mockReset();
        isPlatformAdminUserIdMock.mockReset();
        isPlatformAdminUserIdMock.mockResolvedValue(false);
        isUserFrozenLiveMock.mockReset();
        isUserFrozenLiveMock.mockResolvedValue(false);
        kvGetMock.mockReset();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it('identifies demo guest user id', () => {
        expect(isDemoGuestUserId(DEMO_GUEST_USER_ID)).toBe(true);
        expect(isDemoGuestUserId('real-user-uuid')).toBe(false);
    });

    it('allows guest writes in development', () => {
        process.env.NODE_ENV = 'development';
        expect(rejectDemoGuestForumWrite(DEMO_GUEST_USER_ID)).toBeNull();
    });

    it('blocks guest writes in production', () => {
        process.env.NODE_ENV = 'production';
        const res = rejectDemoGuestForumWrite(DEMO_GUEST_USER_ID);
        expect(res).not.toBeNull();
        expect(res!.status).toBe(401);
    });

    it('blocks frozen accounts from forum api access with Arabic freeze copy', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'lawyer-frozen' });
        isUserFrozenLiveMock.mockResolvedValue(true);

        const res = await requireForumAuth(new Request('http://localhost/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
        const body = await (res as { response: Response }).response.json();
        expect(body.code).toBe('ACCOUNT_FROZEN');
        expect(String(body.error)).toContain('تم تجميد حسابك');
        expect(canAccessLawyerForumUserIdMock).not.toHaveBeenCalled();
    });

    it('blocks non-lawyer accounts from forum api access', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'client-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(false);

        const res = await requireForumAuth(new Request('http://localhost/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
    });

    it('allows active lawyer accounts into forum api access', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'lawyer-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(false);
        kvGetMock.mockResolvedValue({ status: 'active', userId: 'lawyer-1' });

        const res = await requireForumAuth(new Request('http://localhost/api/forum/posts'));
        expect(res).toEqual({
            ok: true,
            userId: 'lawyer-1',
            token: 'tok',
            isAdmin: false,
        });
    });

    it('fail-closes forum when verification KV record is missing', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'lawyer-skip-kyc' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(false);
        kvGetMock.mockResolvedValue(null);

        const res = await requireForumAuth(new Request('http://localhost/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
        const body = await (res as { response: Response }).response.json();
        expect(body.code).toBe('FORUM_VERIFICATION_REQUIRED');
    });

    it('blocks pending verification from forum api', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'lawyer-pending' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(false);
        kvGetMock.mockResolvedValue({ status: 'pending', userId: 'lawyer-pending' });

        const res = await requireForumAuth(new Request('http://localhost/api/forum/posts'));
        expect('response' in res && res.response.status).toBe(403);
    });

    it('rejects demo guest from forum admin even when moderator mock is true', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: DEMO_GUEST_USER_ID });
        isForumModeratorUserIdMock.mockResolvedValue(true);

        const res = await requireForumAdminAuth(new Request('http://localhost/api/forum/stats'));
        expect('response' in res && res.response.status).toBe(403);
        expect(vi.mocked(recordWifeRejection)).toHaveBeenCalledWith(
            expect.objectContaining({ reason: 'forum_guest_admin_denied' }),
        );
    });

    it('allows verified forum moderator into admin gate', async () => {
        requireWifeUserMock.mockResolvedValue({ ok: true, userId: 'mod-1' });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(true);
        kvGetMock.mockResolvedValue({ status: 'active', userId: 'mod-1' });

        const res = await requireForumAdminAuth(new Request('http://localhost/api/forum/stats'));
        expect(res).toEqual({
            ok: true,
            userId: 'mod-1',
            token: 'tok',
            isAdmin: true,
        });
    });

    it('allows platform admin into forum admin APIs without lawyer KYC', async () => {
        requireWifeUserMock.mockResolvedValue({
            ok: true,
            userId: 'a2532b41-add9-463f-9447-b6f933a79fea',
        });
        canAccessLawyerForumUserIdMock.mockResolvedValue(true);
        isPlatformAdminUserIdMock.mockResolvedValue(true);
        isForumModeratorUserIdMock.mockResolvedValue(true);

        const res = await requireForumAdminAuth(new Request('http://localhost/api/forum/reports'));
        expect(res).toEqual({
            ok: true,
            userId: 'a2532b41-add9-463f-9447-b6f933a79fea',
            token: 'tok',
            isAdmin: true,
        });
        expect(kvGetMock).not.toHaveBeenCalled();
    });
});

describe('forumCatchJsonResponse', () => {
    it('لا يسرّب رسالة Postgres للعميل', async () => {
        const res = forumCatchJsonResponse(new Error('permission denied for table forum_posts'));
        expect(res.status).toBe(500);
        const body = (await res.json()) as { error?: string };
        expect(body.error).toBe(FORUM_GENERIC_500);
        expect(body.error).not.toContain('permission denied');
    });

    it('يمرّر رسالة عربية معروفة كـ 403', async () => {
        const res = forumCatchJsonResponse(new Error('يجب الانضمام للمجموعة قبل النشر فيها'));
        expect(res.status).toBe(403);
        const body = (await res.json()) as { error?: string };
        expect(body.error).toContain('الانضمام للمجموعة');
    });

    it('يمرّر غير موجود كـ 404', async () => {
        const res = forumCatchJsonResponse(new Error('المنشور غير موجود'));
        expect(res.status).toBe(404);
    });
});
