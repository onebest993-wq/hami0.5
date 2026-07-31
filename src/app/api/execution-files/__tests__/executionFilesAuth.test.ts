import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('execution-files _auth', () => {
    const originalNodeEnv = process.env.NODE_ENV;
    const originalAllow = process.env.EXECUTION_ALLOW_DEMO_GUEST;

    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        if (originalAllow === undefined) delete process.env.EXECUTION_ALLOW_DEMO_GUEST;
        else process.env.EXECUTION_ALLOW_DEMO_GUEST = originalAllow;
    });

    it('يرفض ضيف العرض في الإنتاج', async () => {
        process.env.NODE_ENV = 'production';
        delete process.env.EXECUTION_ALLOW_DEMO_GUEST;
        const { rejectExecutionDemoGuest, EXECUTION_DEMO_GUEST_USER_ID } = await import(
            '@/app/api/execution-files/_auth'
        );
        const denied = rejectExecutionDemoGuest(EXECUTION_DEMO_GUEST_USER_ID);
        expect(denied).not.toBeNull();
        expect(denied!.status).toBe(401);
    });

    it('يسمح بالضيف في الإنتاج عند EXECUTION_ALLOW_DEMO_GUEST=1', async () => {
        process.env.NODE_ENV = 'production';
        process.env.EXECUTION_ALLOW_DEMO_GUEST = '1';
        const { rejectExecutionDemoGuest, EXECUTION_DEMO_GUEST_USER_ID } = await import(
            '@/app/api/execution-files/_auth'
        );
        expect(rejectExecutionDemoGuest(EXECUTION_DEMO_GUEST_USER_ID)).toBeNull();
    });

    it('لا يرفض مستخدماً حقيقياً', async () => {
        process.env.NODE_ENV = 'production';
        const { rejectExecutionDemoGuest } = await import('@/app/api/execution-files/_auth');
        expect(rejectExecutionDemoGuest('lawyer-real-1')).toBeNull();
    });
});
