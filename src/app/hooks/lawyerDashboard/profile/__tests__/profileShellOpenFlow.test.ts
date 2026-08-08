import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    revealMock: vi.fn(() => true),
    dismissMock: vi.fn(),
    prefetchChunksMock: vi.fn(),
    warmSideEffectsMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/services/profile/profilePerfMetrics', () => ({
    clearProfilePerfMarks: mocks.clearPerfMock,
    markProfilePerfPhase: mocks.markPerfMock,
}));

vi.mock('@/app/runtime/profileInstantPaint', () => ({
    revealProfileWarmShell: mocks.revealMock,
}));

vi.mock('@/app/runtime/profileShellPrime', () => ({
    primeProfileForOpen: vi.fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/runtime/settingsInstantPaint', () => ({
    concealSettingsWarmShell: vi.fn(),
}));

vi.mock('@/app/hooks/lawyerDashboard/profile/profileLazyImports', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/app/hooks/lawyerDashboard/profile/profileLazyImports')
    >();
    return {
        ...actual,
        prefetchProfileShellChunks: mocks.prefetchChunksMock,
        loadProfileWarmCache: vi.fn(() =>
            Promise.resolve({
                ensureProfilePaintReady: vi.fn(() => Promise.resolve(null)),
            }),
        ),
    };
});

describe('profileShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.revealMock.mockReturnValue(true);
        document.body.innerHTML = '';
    });

    it('commitProfileOpen يفتح الملف ويُسجّل perf فوراً', async () => {
        document.body.innerHTML = '<div data-testid="lawyer-dashboard-profile-surface"></div>';
        const { commitProfileOpen } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellOpenFlow'
        );
        const openInFlightRef = { current: false };
        const setActiveTab = vi.fn();

        commitProfileOpen({
            userId: 'lawyer-1',
            openInFlightRef,
            setProfileHostMounted: vi.fn(),
            setShowCommunity: vi.fn(),
            setActiveTab,
            setProfileOpenEpoch: vi.fn((fn) => (typeof fn === 'function' ? fn(0) : fn)),
        });

        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(mocks.revealMock).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalledWith('profile');
        expect(mocks.dismissMock).toHaveBeenCalledWith('profile');
        await vi.waitFor(() => {
            expect(mocks.prefetchChunksMock).toHaveBeenCalled();
        });
    });

    it('commitProfileOpen يزامن React حتى لو كان snap مفتوحاً مسبقاً', async () => {
        document.body.innerHTML = '<div data-testid="lawyer-dashboard-profile-surface"></div>';
        const { commitProfileOpen } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellOpenFlow'
        );
        const setActiveTab = vi.fn();

        commitProfileOpen({
            userId: 'lawyer-1',
            openInFlightRef: { current: false },
            setProfileHostMounted: vi.fn(),
            setShowCommunity: vi.fn(),
            setActiveTab,
            setProfileOpenEpoch: vi.fn(),
        });

        expect(setActiveTab).toHaveBeenCalledWith('profile');
    });

    it('commitProfileOpen يتخطى إذا كان فتحاً قيد التنفيذ', async () => {
        const { commitProfileOpen } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellOpenFlow'
        );

        commitProfileOpen({
            userId: 'lawyer-1',
            openInFlightRef: { current: true },
            setProfileHostMounted: vi.fn(),
            setShowCommunity: vi.fn(),
            setActiveTab: vi.fn(),
            setProfileOpenEpoch: vi.fn(),
        });

        expect(mocks.clearPerfMock).not.toHaveBeenCalled();
    });
});
