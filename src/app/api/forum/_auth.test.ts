import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

const requireWifeUserMock = vi.fn();
const canAccessLawyerForumUserIdMock = vi.fn();
const isForumModeratorUserIdMock = vi.fn();

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
}));

import {
    DEMO_GUEST_USER_ID,
    isDemoGuestUserId,
    requireForumAuth,
    rejectDemoGuestForumWrite,
} from './_auth.ts';

describe('forum _auth guest policy', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.restoreAllMocks();
        requireWifeUserMock.mockReset();
        canAccessLawyerForumUserIdMock.mockReset();
        isForumModeratorUserIdMock.mockReset();
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

        const res = await requireForumAuth(new Request('http://localhost/api/forum/posts'));
        expect(res).toEqual({
            ok: true,
            userId: 'lawyer-1',
            token: 'tok',
            isAdmin: false,
        });
    });
});
