import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    revealMock: vi.fn(() => true),
    dismissMock: vi.fn(),
    prefetchChunksMock: vi.fn(),
    hydrateSyncMock: vi.fn(),
    concealSettingsMock: vi.fn(),
    scheduleSyncMock: vi.fn((run: () => void) => run()),
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
    concealSettingsWarmShell: mocks.concealSettingsMock,
}));

vi.mock('@/app/services/profile/profileWarmCache', () => ({
    hydrateProfileWarmCachePeekSync: mocks.hydrateSyncMock,
}));

vi.mock('@/app/services/profile/profileShellSnap', () => ({
    scheduleProfileShellReactSync: mocks.scheduleSyncMock,
}));

vi.mock('@/app/runtime/royalLawyerProfileLoader', () => ({
    loadProfileHubModule: vi.fn(() => Promise.resolve([])),
    prefetchProfileHubModule: vi.fn(),
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
    beforeEach(async () => {
        vi.clearAllMocks();
        mocks.revealMock.mockReturnValue(true);
        mocks.scheduleSyncMock.mockImplementation((run: () => void) => run());
        document.body.innerHTML = '';
        const hub = await import('@/app/runtime/royalLawyerProfileLoader');
        vi.mocked(hub.loadProfileHubModule).mockResolvedValue([] as never);
    });

    it('commitProfileOpen يكشف فوراً قبل أي عمل ثقيل', async () => {
        document.body.innerHTML = '<div data-testid="lawyer-dashboard-profile-surface"></div>';
        const hub = await import('@/app/runtime/royalLawyerProfileLoader');
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

        expect(setActiveTab).toHaveBeenCalledWith('profile');
        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(openInFlightRef.current).toBe(true);
        await Promise.resolve();
        expect(openInFlightRef.current).toBe(false);

        await vi.waitFor(() => {
            expect(mocks.hydrateSyncMock).toHaveBeenCalledWith('lawyer-1');
            expect(hub.loadProfileHubModule).toHaveBeenCalled();
            expect(mocks.dismissMock).toHaveBeenCalledWith('profile');
        });
    });

    it('commitProfileOpen: hydrate ثم تبويب ثم reveal', async () => {
        document.body.innerHTML = '<div data-testid="lawyer-dashboard-profile-surface"></div>';
        const order: string[] = [];
        mocks.revealMock.mockImplementation(() => {
            order.push('reveal');
            return true;
        });
        mocks.hydrateSyncMock.mockImplementation(() => {
            order.push('hydrate');
            return null;
        });
        const setActiveTab = vi.fn(() => {
            order.push('tab');
        });

        const { commitProfileOpen } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellOpenFlow'
        );

        commitProfileOpen({
            userId: 'lawyer-1',
            openInFlightRef: { current: false },
            setProfileHostMounted: vi.fn(),
            setShowCommunity: vi.fn(),
            setActiveTab,
            setProfileOpenEpoch: vi.fn(),
        });

        expect(order.indexOf('hydrate')).toBeLessThan(order.indexOf('tab'));
        expect(order.indexOf('tab')).toBeLessThan(order.indexOf('reveal'));
        expect(setActiveTab).toHaveBeenCalledWith('profile');
    });

    it('commitProfileOpen يزامن React حتى لو hub معلّق', async () => {
        const hub = await import('@/app/runtime/royalLawyerProfileLoader');
        vi.mocked(hub.loadProfileHubModule).mockReturnValue(new Promise(() => undefined));
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
        expect(mocks.revealMock).toHaveBeenCalled();
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

    it('commitProfileOpen يمنع النقر المزدوج في نفس الدورة', async () => {
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
            setProfileOpenEpoch: vi.fn(),
        });
        expect(openInFlightRef.current).toBe(true);
        commitProfileOpen({
            userId: 'lawyer-1',
            openInFlightRef,
            setProfileHostMounted: vi.fn(),
            setShowCommunity: vi.fn(),
            setActiveTab,
            setProfileOpenEpoch: vi.fn(),
        });

        expect(setActiveTab).toHaveBeenCalledTimes(1);
        await Promise.resolve();
        expect(openInFlightRef.current).toBe(false);
    });

    it('commitProfileOpen يفعّل التبويب فوراً — صفحة الفتح تغطي Suspense', async () => {
        mocks.revealMock.mockReturnValue(false);
        document.body.innerHTML = '<div data-testid="lawyer-dashboard-profile-surface"></div>';
        const { commitProfileOpen } = await import(
            '@/app/hooks/lawyerDashboard/profile/profileShellOpenFlow'
        );
        const setActiveTab = vi.fn();
        const setProfileHostMounted = vi.fn();

        commitProfileOpen({
            userId: 'lawyer-1',
            openInFlightRef: { current: false },
            setProfileHostMounted,
            setShowCommunity: vi.fn(),
            setActiveTab,
            setProfileOpenEpoch: vi.fn(),
        });

        expect(setProfileHostMounted).toHaveBeenCalledWith(true);
        expect(setActiveTab).toHaveBeenCalledWith('profile');
    });
});
