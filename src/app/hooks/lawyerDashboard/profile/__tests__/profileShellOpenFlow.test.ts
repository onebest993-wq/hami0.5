import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    snapOpenMock: vi.fn(() => true),
    snapCloseMock: vi.fn(),
    isSnappedOpenMock: vi.fn(() => false),
    scheduleReactSyncMock: vi.fn((fn: () => void) => fn()),
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

vi.mock('@/app/services/profile/profileShellSnap', () => ({
    snapProfileShellOpen: mocks.snapOpenMock,
    snapProfileShellClose: mocks.snapCloseMock,
    isProfileShellSnappedOpen: mocks.isSnappedOpenMock,
    scheduleProfileShellReactSync: mocks.scheduleReactSyncMock,
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
}));

vi.mock('@/app/hooks/lawyerDashboard/profile/profileLazyImports', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/app/hooks/lawyerDashboard/profile/profileLazyImports')
    >();
    return {
        ...actual,
        prefetchProfileShellChunks: mocks.prefetchChunksMock,
        warmProfileOpenSideEffects: mocks.warmSideEffectsMock,
        loadProfileIntentWarm: vi.fn(() =>
            Promise.resolve({
                warmProfileOnOpen: mocks.warmOnOpenMock,
            }),
        ),
    };
});

describe('profileShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.isSnappedOpenMock.mockReturnValue(false);
        mocks.snapOpenMock.mockReturnValue(true);
    });

    it('commitProfileOpen يفتح الملف ويُسجّل perf', async () => {
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
        expect(mocks.snapOpenMock).toHaveBeenCalled();
        expect(setActiveTab).toHaveBeenCalledWith('profile');
        expect(mocks.dismissMock).toHaveBeenCalledWith('profile');
        expect(mocks.warmSideEffectsMock).toHaveBeenCalledWith('lawyer-1');
    });

    it('commitProfileOpen يتخطى إذا كان مفتوحاً', async () => {
        const { commitProfileOpen } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellOpenFlow'
        );
        mocks.isSnappedOpenMock.mockReturnValue(true);

        commitProfileOpen({
            userId: 'lawyer-1',
            openInFlightRef: { current: false },
            setProfileHostMounted: vi.fn(),
            setShowCommunity: vi.fn(),
            setActiveTab: vi.fn(),
            setProfileOpenEpoch: vi.fn(),
        });

        expect(mocks.clearPerfMock).not.toHaveBeenCalled();
    });
});
