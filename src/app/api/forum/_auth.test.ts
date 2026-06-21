import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
    DEMO_GUEST_USER_ID,
    isDemoGuestUserId,
    rejectDemoGuestForumWrite,
} from './_auth.ts';

describe('forum _auth guest policy', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.restoreAllMocks();
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
});
