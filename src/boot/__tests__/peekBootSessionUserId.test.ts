import { describe, expect, it, vi, beforeEach } from 'vitest';

import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';

describe('peekBootSessionUserIdSync', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('يقرأ معرّف المستخدم من توكن Supabase المحلي', () => {
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'lawyer-42' } }),
        );
        expect(peekBootSessionUserIdSync()).toBe('lawyer-42');
    });

    it('يعيد null عند غياب الجلسة', () => {
        expect(peekBootSessionUserIdSync()).toBeNull();
    });
});

describe('kickoffBootCriticalPreload execution warm', () => {
    it('يبدأ تسخين إضابير التنفيذ مبكراً', async () => {
        vi.resetModules();
        const start = vi.fn();
        vi.doMock('@/app/runtime/executionFilesEagerHydrate', () => ({
            startExecutionFilesEagerHydrate: start,
        }));
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'u-early' } }),
        );
        const { kickoffBootCriticalPreload } = await import('@/boot/bootCriticalPreload');
        kickoffBootCriticalPreload();
        await vi.waitFor(() => {
            expect(start).toHaveBeenCalledWith('u-early');
        });
    });
});
