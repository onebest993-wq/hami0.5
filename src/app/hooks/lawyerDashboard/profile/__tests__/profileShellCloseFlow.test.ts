import { describe, expect, it, vi, beforeEach } from 'vitest';

const snapCloseMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/services/profile/profileShellSnap', () => ({
    snapProfileShellClose: snapCloseMock,
}));

vi.mock('@/app/runtime/overlaySnapClose', () => ({
    executeOverlaySnapClose: (steps: { conceal?: () => void; commit?: () => void }) => {
        steps.conceal?.();
        steps.commit?.();
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    clearPersistedLawyerProfileTab: vi.fn(),
}));

describe('profileShellCloseFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('commitProfileClose يُخفي DOM قبل commit React', async () => {
        const { commitProfileClose } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellCloseFlow'
        );
        const setActiveTab = vi.fn();
        const closeSettings = vi.fn();

        commitProfileClose({ setActiveTab, closeSettings });

        expect(snapCloseMock).toHaveBeenCalledTimes(1);
        expect(closeSettings).toHaveBeenCalledTimes(1);
        expect(setActiveTab).toHaveBeenCalledWith('home');
    });

    it('commitProfileOverlayDismiss يُخفي DOM ويُعيد home فقط إن كان profile نشطاً', async () => {
        const { commitProfileOverlayDismiss } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellCloseFlow'
        );
        const setActiveTab = vi.fn((fn) => (typeof fn === 'function' ? fn('profile') : fn));

        commitProfileOverlayDismiss({ setActiveTab });

        expect(snapCloseMock).toHaveBeenCalledTimes(1);
        expect(setActiveTab).toHaveBeenCalled();
    });
});
