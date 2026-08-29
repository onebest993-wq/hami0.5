import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmBootLawyerProfile } from '@/app/services/profile/warmBootLawyerProfile';
import { getLawyerProfileLocalKey } from '@/app/services/profile/profileLocalKey';
import {
    isLawyerProfileBootWarmPending,
    resetLawyerProfileBootWarmPendingForTests,
} from '@/app/services/profile/profileBootWarmPending';

describe('warmBootLawyerProfile', () => {
    beforeEach(() => {
        localStorage.clear();
        resetLawyerProfileBootWarmPendingForTests();
    });

    it('لا يسخّن شيئاً بلا جلسة', async () => {
        const warmKeys = vi.fn().mockResolvedValue(undefined);
        await warmBootLawyerProfile({ warmKeys });
        expect(warmKeys).not.toHaveBeenCalled();
    });

    it('يسخّن مفتاح الملف للمستخدم الحالي', async () => {
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'lawyer-42' } }),
        );
        const kickoffBootShellSync = vi.fn();
        const warmKeys = vi.fn().mockResolvedValue(undefined);
        await warmBootLawyerProfile({ kickoffBootShellSync, warmKeys });
        expect(kickoffBootShellSync).toHaveBeenCalledTimes(1);
        expect(warmKeys).toHaveBeenCalledWith([getLawyerProfileLocalKey('lawyer-42')]);
        expect(isLawyerProfileBootWarmPending()).toBe(false);
    });
});
