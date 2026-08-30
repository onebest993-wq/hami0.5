import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
    warmDataCacheMock: vi.fn(),
    prefetchHubMock: vi.fn(),
    loadOverlayEntryMock: vi.fn(() => Promise.resolve({})),
    isOverlayResolvedMock: vi.fn(() => true),
}));

vi.mock('react-dom', () => ({
    flushSync: (fn: () => void) => fn(),
}));

vi.mock('@/app/utils/bodyScrollLock', () => ({
    dismissTransientOverlays: mocks.dismissMock,
    reconcileBodyScrollLock: vi.fn(),
}));

vi.mock('@/app/services/repository/repositoryPerfMetrics', () => ({
    clearRepositoryPerfMarks: mocks.clearPerfMock,
    markRepositoryPerfPhase: mocks.markPerfMock,
}));

vi.mock('@/app/runtime/repositoryInstantPaint', () => ({
    applyRepositoryOpaqueChrome: vi.fn(),
    paintRepositoryInstantChrome: vi.fn(() => false),
    concealRepositoryWarmShell: vi.fn(),
    hideRepositoryKeepAliveLayer: vi.fn(),
    REPOSITORY_INSTANT_DISMISS_EVENT: 'hami:repository-instant-dismiss',
    REPOSITORY_INSTANT_CHROME_ID: 'hami-repository-instant-chrome',
}));

vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardNav', () => ({
    persistRepositorySessionOpen: vi.fn(),
}));

vi.mock('@/app/runtime/repositoryHubLoader', () => ({
    prefetchRepositoryHubModule: mocks.prefetchHubMock,
    isRepositoryHubModuleResolved: () => mocks.isOverlayResolvedMock(),
    loadRepositoryHubModule: () => mocks.loadOverlayEntryMock(),
}));

vi.mock('@/app/hooks/lawyerDashboard/repository/repositoryLazyImports', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/app/hooks/lawyerDashboard/repository/repositoryLazyImports')
    >();
    return {
        ...actual,
        loadRepositoryIntentWarm: vi.fn(() =>
            Promise.resolve({
                warmRepositoryOnOpen: mocks.warmOnOpenMock,
                warmRepositoryDataCache: mocks.warmDataCacheMock,
            }),
        ),
    };
});

describe('repositoryShellOpenFlow', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mocks.isOverlayResolvedMock.mockReturnValue(true);
        mocks.loadOverlayEntryMock.mockImplementation(() => Promise.resolve({}));
        const { resetRepositoryOpenFlowForTests } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        resetRepositoryOpenFlowForTests();
    });

    it('commitRepositoryOpen يفتح المستودع ويُسجّل perf', async () => {
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const armRepositoryHost = vi.fn();
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen({
            userId: 'lawyer-1',
            opts: { tab: 'vault', scanner: true },
            armRepositoryHost,
            setRepositoryTab: vi.fn(),
            setNotepadMode: vi.fn(),
            setFocusNoteId: vi.fn(),
            setVaultOpenScanner: vi.fn(),
            setRepositoryOpenEpoch: vi.fn((fn) => fn(0)),
            setIsRepositoryOpen,
        });

        expect(mocks.clearPerfMock).toHaveBeenCalled();
        expect(mocks.markPerfMock).toHaveBeenCalledWith('open-request');
        expect(mocks.prefetchHubMock).toHaveBeenCalled();
        expect(armRepositoryHost).toHaveBeenCalled();
        expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);

        expect(mocks.dismissMock).toHaveBeenCalledWith('repository');
        expect(mocks.dismissMock).toHaveBeenCalledTimes(1);
        expect(mocks.markPerfMock).toHaveBeenCalledWith('interactive');

        await vi.waitFor(() => {
            expect(mocks.warmOnOpenMock).toHaveBeenCalledWith('lawyer-1', 'vault');
            expect(mocks.warmDataCacheMock).toHaveBeenCalledWith('lawyer-1');
        });
    });

    it('commitRepositoryOpen يكشف Host فوراً دون انتظار المقطع', async () => {
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        mocks.loadOverlayEntryMock.mockImplementation(async () => {
            mocks.isOverlayResolvedMock.mockReturnValue(true);
            return {};
        });
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen({
            userId: 'lawyer-1',
            armRepositoryHost: vi.fn(),
            setRepositoryTab: vi.fn(),
            setNotepadMode: vi.fn(),
            setFocusNoteId: vi.fn(),
            setVaultOpenScanner: vi.fn(),
            setRepositoryOpenEpoch: vi.fn((fn) => fn(0)),
            setIsRepositoryOpen,
        });

        expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);
        expect(mocks.loadOverlayEntryMock).toHaveBeenCalled();
    });

    it('commitRepositoryOpen يبقي الفتح إن فشل المقطع ويُخطر', async () => {
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        mocks.loadOverlayEntryMock.mockRejectedValue(new Error('chunk'));
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const { concealRepositoryWarmShell } = await import('@/app/runtime/repositoryInstantPaint');
        const setIsRepositoryOpen = vi.fn();
        const onChunkFailed = vi.fn();

        commitRepositoryOpen({
            userId: 'lawyer-1',
            armRepositoryHost: vi.fn(),
            setRepositoryTab: vi.fn(),
            setNotepadMode: vi.fn(),
            setFocusNoteId: vi.fn(),
            setVaultOpenScanner: vi.fn(),
            setRepositoryOpenEpoch: vi.fn((fn) => fn(0)),
            setIsRepositoryOpen,
            onChunkFailed,
        });

        expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);
        await vi.waitFor(() => {
            expect(onChunkFailed).toHaveBeenCalled();
        });
        expect(concealRepositoryWarmShell).not.toHaveBeenCalled();
    });

    it('commitRepositoryClose يغلق المستودع بعد conceal', async () => {
        const { commitRepositoryClose } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const { concealRepositoryWarmShell } = await import('@/app/runtime/repositoryInstantPaint');
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryClose({
            setIsRepositoryOpen,
            setFocusNoteId: vi.fn(),
            setVaultOpenScanner: vi.fn(),
            setRepositoryHostMounted: vi.fn(),
        });

        expect(concealRepositoryWarmShell).toHaveBeenCalled();
        await new Promise<void>((resolve) => {
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => resolve());
            } else {
                resolve();
            }
        });
        expect(setIsRepositoryOpen).toHaveBeenCalledWith(false);
    });
});
