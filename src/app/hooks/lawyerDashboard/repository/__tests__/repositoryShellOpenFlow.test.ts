import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
    warmDataCacheMock: vi.fn(),
    prefetchHubMock: vi.fn(),
    loadHubMock: vi.fn(() => Promise.resolve({})),
    prefetchOverlayMock: vi.fn(),
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
}));

vi.mock('@/app/hooks/lawyerDashboard/repository/repositoryLazyImports', async (importOriginal) => {
    const actual = await importOriginal<
        typeof import('@/app/hooks/lawyerDashboard/repository/repositoryLazyImports')
    >();
    return {
        ...actual,
        prefetchRepositoryHubAndOverlay: mocks.prefetchOverlayMock,
        loadRepositoryIntentWarm: vi.fn(() =>
            Promise.resolve({
                warmRepositoryOnOpen: mocks.warmOnOpenMock,
                warmRepositoryDataCache: mocks.warmDataCacheMock,
            }),
        ),
    };
});

describe('repositoryShellOpenFlow', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
        expect(mocks.prefetchOverlayMock).toHaveBeenCalled();
        expect(armRepositoryHost).toHaveBeenCalled();
        expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);

        expect(mocks.dismissMock).toHaveBeenCalledWith('repository');
        expect(mocks.dismissMock).toHaveBeenCalledTimes(1);

        await new Promise<void>((resolve) => queueMicrotask(resolve));
        expect(mocks.warmOnOpenMock).toHaveBeenCalledWith('lawyer-1', 'vault');
        expect(mocks.warmDataCacheMock).toHaveBeenCalledWith('lawyer-1');
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
