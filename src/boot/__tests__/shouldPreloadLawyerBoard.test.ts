import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    clearLegalTermsAcceptance,
    markLegalTermsAccepted,
} from '@/app/services/auth/legalTermsAcceptance';
import { clearExplicitLocalGuest, markExplicitLocalGuest } from '@/app/services/auth/localGuestSession';
import {
    clearPasswordRecoveryPending,
    markPasswordRecoveryPending,
} from '@/app/services/auth/passwordRecoveryGate';

describe('shouldPreloadLawyerDashboardBoard', () => {
    beforeEach(() => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'false');
        localStorage.clear();
        sessionStorage.clear();
        clearLegalTermsAcceptance();
        clearExplicitLocalGuest();
        clearPasswordRecoveryPending();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        clearLegalTermsAcceptance();
        clearExplicitLocalGuest();
        clearPasswordRecoveryPending();
    });

    it('يرفض التسخين بلا شروط ولا جلسة', async () => {
        const { shouldPreloadLawyerDashboardBoard } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(shouldPreloadLawyerDashboardBoard()).toBe(false);
    });

    it('يفتح اللوحة عند تجاوز الشِل (E2E)', async () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        vi.resetModules();
        const { shouldPreloadLawyerDashboardBoard } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(shouldPreloadLawyerDashboardBoard()).toBe(true);
    });

    it('يفتح اللوحة بعد شروط + جلسة حقيقية في التخزين', async () => {
        markLegalTermsAccepted();
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'lawyer-real-1' } }),
        );
        const { shouldPreloadLawyerDashboardBoard } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(shouldPreloadLawyerDashboardBoard()).toBe(true);
    });

    it('عند الخروج الصريح لا تُفتح اللوحة من لقطة التخزين', async () => {
        markLegalTermsAccepted();
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'lawyer-real-1' } }),
        );
        const { shouldEnterLawyerDashboardBoard } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(shouldEnterLawyerDashboardBoard(null)).toBe(false);
        expect(shouldEnterLawyerDashboardBoard('lawyer-real-1')).toBe(true);
    });

    it('بعد عبور الهوية تبقى اللوحة عند وميض user دون خروج صريح', async () => {
        const { resolveLawyerBoardEnter } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(
            resolveLawyerBoardEnter({
                forcedAuthLane: false,
                laneReleased: true,
                liveUserId: undefined,
            }),
        ).toBe(true);
        expect(
            resolveLawyerBoardEnter({
                forcedAuthLane: true,
                laneReleased: true,
                liveUserId: undefined,
            }),
        ).toBe(false);
    });

    it('لا يسخّن اللوحة أثناء استعادة كلمة المرور', async () => {
        markLegalTermsAccepted();
        localStorage.setItem(
            'sb-test-auth-token',
            JSON.stringify({ user: { id: 'lawyer-real-1' } }),
        );
        markPasswordRecoveryPending();
        const { shouldPreloadLawyerDashboardBoard } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(shouldPreloadLawyerDashboardBoard()).toBe(false);
    });

    it('يفتح اللوحة للضيف الصريح بعد الشروط', async () => {
        markLegalTermsAccepted();
        markExplicitLocalGuest();
        const { shouldPreloadLawyerDashboardBoard } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(shouldPreloadLawyerDashboardBoard()).toBe(true);
    });

    it('لا يسخّن اللوحة على /admin', async () => {
        vi.stubEnv('VITE_SHELL_AUTH_OPEN', 'true');
        window.history.pushState({}, '', '/admin');
        vi.resetModules();
        const { shouldPreloadLawyerDashboardBoard } = await import('@/boot/shouldPreloadLawyerBoard');
        expect(shouldPreloadLawyerDashboardBoard()).toBe(false);
        window.history.pushState({}, '', '/');
    });
});
