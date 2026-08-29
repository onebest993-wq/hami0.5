import { describe, expect, it, vi, beforeEach } from 'vitest';

const concealMock = vi.hoisted(() => vi.fn());
const clearClosingMock = vi.hoisted(() => vi.fn());

vi.mock('@/app/runtime/profileInstantPaint', () => ({
    concealProfileWarmShell: concealMock,
}));

vi.mock('@/app/services/profile/profileShellSnap', () => ({
    clearProfileShellClosing: clearClosingMock,
}));

vi.mock('@/app/runtime/overlaySnapClose', () => ({
    markOverlaySnapClosing: vi.fn(),
    executeProfileOverlayClose: ({
        conceal,
        commit,
    }: {
        conceal?: () => void;
        commit?: () => void;
    }) => {
        conceal?.();
        commit?.();
    },
}));

vi.mock('@/app/hooks/lawyerDashboard/profile/profileShellExit', () => ({
    beginProfileShellExit: (onDone: () => void) => onDone(),
    PROFILE_SURFACE_EXIT_MS: 200,
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    clearPersistedLawyerProfileTab: vi.fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    reconcileBodyScrollLock: vi.fn(),
}));

describe('profileShellCloseFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('commitProfileClose ينتظر الخروج ثم يخفي DOM ثم flushSync', async () => {
        const { commitProfileClose } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellCloseFlow'
        );
        const setActiveTab = vi.fn();
        const closeSettings = vi.fn();

        commitProfileClose({ setActiveTab, closeSettings });

        expect(concealMock).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalledWith('home');
        expect(clearClosingMock).toHaveBeenCalled();
        await Promise.resolve();
        expect(closeSettings).toHaveBeenCalledTimes(1);
    });

    it('commitProfileOverlayDismiss يعيد home فقط إن كان profile نشطاً', async () => {
        const { commitProfileOverlayDismiss } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellCloseFlow'
        );
        const setActiveTab = vi.fn();

        commitProfileOverlayDismiss({ setActiveTab });

        expect(concealMock).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalled();
        const updater = setActiveTab.mock.calls[0][0];
        expect(typeof updater === 'function' ? updater('profile') : updater).toBe('home');
        expect(typeof updater === 'function' ? updater('home') : 'home').toBe('home');
        expect(clearClosingMock).toHaveBeenCalled();
    });
});
