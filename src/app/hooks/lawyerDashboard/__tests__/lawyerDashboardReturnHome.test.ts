import { describe, expect, it, vi, beforeEach } from 'vitest';
import { returnToLawyerHomeDashboard } from '@/app/hooks/lawyerDashboard/lawyerDashboardReturnHome';

const dismissMock = vi.fn();

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: (...args: unknown[]) => dismissMock(...args),
}));

describe('returnToLawyerHomeDashboard', () => {
    beforeEach(() => {
        dismissMock.mockClear();
        document.documentElement.removeAttribute('data-hami-profile-open');
    });

    it('يُغلق snap الملف ويضبط التبويب على الرئيسية', () => {
        document.documentElement.setAttribute('data-hami-profile-open', '1');
        const setActiveTab = vi.fn();
        const closeHubShellOverlays = vi.fn();
        const exitCriminalDossierToHome = vi.fn();

        returnToLawyerHomeDashboard({
            setActiveTab,
            closeHubShellOverlays,
            exitCriminalDossierToHome,
        });

        expect(document.documentElement.hasAttribute('data-hami-profile-open')).toBe(false);
        expect(exitCriminalDossierToHome).toHaveBeenCalledTimes(1);
        expect(closeHubShellOverlays).toHaveBeenCalledTimes(1);
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('يُطلق dismissTransientOverlays في microtask', async () => {
        returnToLawyerHomeDashboard({
            setActiveTab: vi.fn(),
            closeHubShellOverlays: vi.fn(),
        });
        expect(dismissMock).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(dismissMock).toHaveBeenCalledTimes(1);
    });
});
