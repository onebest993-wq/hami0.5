import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent } from '@testing-library/react';
import {
    consumeNativeBackForTests,
    resetNativeBackHandlersForTests,
} from '@/app/runtime/nativeBackStack';
import { HUB_LAYER_EXIT_MS, HUB_LAYER_EXIT_PAD_MS } from '@/app/runtime/overlayHubLayerMotion';

const mocks = vi.hoisted(() => ({
    dismissMock: vi.fn(),
    clearPerfMock: vi.fn(),
    markPerfMock: vi.fn(),
    warmOnOpenMock: vi.fn(),
    warmDataCacheMock: vi.fn(),
    prefetchHubMock: vi.fn(),
    loadOverlayEntryMock: vi.fn(() => Promise.resolve({})),
    isOverlayResolvedMock: vi.fn(() => true),
    concealMock: vi.fn(),
    paintMock: vi.fn(() => false),
    applyThemeMock: vi.fn(),
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
    applyRepositoryOpenTheme: () => mocks.applyThemeMock(),
    applyRepositoryOpaqueChrome: vi.fn(),
    paintRepositoryInstantChrome: () => mocks.paintMock(),
    concealRepositoryWarmShell: () => mocks.concealMock(),
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

function openArgs(overrides: Record<string, unknown> = {}) {
    return {
        userId: 'lawyer-1',
        armRepositoryHost: vi.fn(),
        setRepositoryTab: vi.fn(),
        setNotepadMode: vi.fn(),
        setFocusNoteId: vi.fn(),
        setVaultOpenScanner: vi.fn(),
        setRepositoryOpenEpoch: vi.fn((fn: (epoch: number) => number) => fn(0)),
        setIsRepositoryOpen: vi.fn(),
        ...overrides,
    };
}

describe('repositoryShellOpenFlow', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        mocks.isOverlayResolvedMock.mockReturnValue(true);
        mocks.loadOverlayEntryMock.mockImplementation(() => Promise.resolve({}));
        resetNativeBackHandlersForTests();
        const { resetRepositoryOpenFlowForTests } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        resetRepositoryOpenFlowForTests();
    });

    it('commitRepositoryOpen يفتح المستودع ويُسجّل perf عندما المقطع جاهز', async () => {
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const armRepositoryHost = vi.fn();
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen(
            openArgs({
                opts: { tab: 'vault', scanner: true },
                armRepositoryHost,
                setIsRepositoryOpen,
            }),
        );

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

    it('commitRepositoryOpen يكشف فوراً إذا كان Host مركّباً حتى دون اكتمال المقطع', async () => {
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen(
            openArgs({
                setIsRepositoryOpen,
                hostAlreadyMounted: true,
            }),
        );

        expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);
        expect(mocks.loadOverlayEntryMock).toHaveBeenCalled();
    });

    it('commitRepositoryOpen ينتظر المقطع قبل تركيب Host إن لم يُحمَّل', async () => {
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        let resolveLoad: (value: unknown) => void = () => undefined;
        mocks.loadOverlayEntryMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }),
        );
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen(openArgs({ setIsRepositoryOpen }));

        expect(setIsRepositoryOpen).not.toHaveBeenCalled();
        expect(mocks.applyThemeMock).toHaveBeenCalled();
        expect(mocks.paintMock).toHaveBeenCalled();

        mocks.isOverlayResolvedMock.mockReturnValue(true);
        resolveLoad({});
        await vi.waitFor(() => {
            expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);
        });
    });

    it('commitRepositoryOpen يبقي الفتح إن فشل المقطع ويُخطر', async () => {
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        mocks.loadOverlayEntryMock.mockRejectedValue(new Error('chunk'));
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();
        const onChunkFailed = vi.fn();

        commitRepositoryOpen(
            openArgs({
                setIsRepositoryOpen,
                onChunkFailed,
            }),
        );

        expect(setIsRepositoryOpen).not.toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);
            expect(onChunkFailed).toHaveBeenCalled();
        });
        expect(mocks.concealMock).not.toHaveBeenCalled();
    });

    it('يكشف بعد مهلة إن علق تحميل مقطع الطبقة', async () => {
        vi.useFakeTimers();
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        mocks.loadOverlayEntryMock.mockImplementation(() => new Promise(() => undefined));
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen(openArgs({ setIsRepositoryOpen }));

        expect(setIsRepositoryOpen).not.toHaveBeenCalled();
        try {
            await vi.advanceTimersByTimeAsync(3_000);
            expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);
        } finally {
            vi.useRealTimers();
        }
    });

    it('Escape أثناء انتظار المقطع يلغي الفتح ولا يكشف بعد وصوله', async () => {
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        let resolveLoad: (value: unknown) => void = () => undefined;
        mocks.loadOverlayEntryMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolveLoad = resolve;
                }),
        );
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen(openArgs({ setIsRepositoryOpen }));

        expect(setIsRepositoryOpen).not.toHaveBeenCalled();
        fireEvent.keyDown(window, { key: 'Escape' });
        expect(mocks.concealMock).toHaveBeenCalled();
        expect(setIsRepositoryOpen).not.toHaveBeenCalled();

        resolveLoad({});
        await Promise.resolve();
        await Promise.resolve();
        expect(setIsRepositoryOpen).not.toHaveBeenCalled();
    });

    it('Cap أثناء انتظار المقطع يلغي الفتح', async () => {
        mocks.isOverlayResolvedMock.mockReturnValue(false);
        mocks.loadOverlayEntryMock.mockImplementation(() => new Promise(() => undefined));
        const { commitRepositoryOpen } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryOpen(openArgs({ setIsRepositoryOpen }));

        expect(consumeNativeBackForTests()).toBe(true);
        expect(mocks.concealMock).toHaveBeenCalled();
        expect(setIsRepositoryOpen).not.toHaveBeenCalled();
    });

    it('commitRepositoryClose يغلق المستودع بعد conceal', async () => {
        const { commitRepositoryClose } = await import(
            '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
        );
        const setIsRepositoryOpen = vi.fn();

        commitRepositoryClose({
            setIsRepositoryOpen,
            setFocusNoteId: vi.fn(),
            setVaultOpenScanner: vi.fn(),
            setRepositoryHostMounted: vi.fn(),
        });

        expect(mocks.concealMock).toHaveBeenCalled();
        await new Promise<void>((resolve) => {
            if (typeof requestAnimationFrame === 'function') {
                requestAnimationFrame(() => resolve());
            } else {
                resolve();
            }
        });
        expect(setIsRepositoryOpen).toHaveBeenCalledWith(false);
    });

    /**
     * الاختبار أعلاه يُغلق بلا فتحٍ سابق، فيكون مُعرِّفا الجلسة صفرين ويمرّ الحارس
     * مهما كان ترتيب التصفير. وبعد فتحٍ حقيقيّ — وهو وحده ما يقع في المنتج — كان
     * التصفير المتزامن بعد `beginHubLayerExit` يبتلع الـcommit فلا يعلم React بالإغلاق.
     */
    it('commitRepositoryClose بعد فتحٍ حقيقي يصل React ولو تأخّر التلاشي', async () => {
        vi.useFakeTimers();
        try {
            const { commitRepositoryOpen, commitRepositoryClose } = await import(
                '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
            );
            /* طبقة حيّة في DOM — بدونها يستدعي beginHubLayerExit onDone فوراً فيختفي العطل */
            const layer = document.createElement('div');
            layer.setAttribute('data-testid', 'smart-repository-modal');
            document.body.appendChild(layer);

            const setIsRepositoryOpen = vi.fn();
            commitRepositoryOpen(openArgs({ setIsRepositoryOpen }));
            expect(setIsRepositoryOpen).toHaveBeenCalledWith(true);

            commitRepositoryClose({
                setIsRepositoryOpen,
                setFocusNoteId: vi.fn(),
                setVaultOpenScanner: vi.fn(),
                setRepositoryHostMounted: vi.fn(),
            });

            expect(setIsRepositoryOpen).not.toHaveBeenCalledWith(false);
            await vi.advanceTimersByTimeAsync(HUB_LAYER_EXIT_MS + HUB_LAYER_EXIT_PAD_MS + 8);
            expect(setIsRepositoryOpen).toHaveBeenCalledWith(false);
            expect(mocks.concealMock).toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
            document.body.innerHTML = '';
        }
    });

    it('فتحٌ جديد أثناء التلاشي لا يُغلقه الإغلاق المعلّق', async () => {
        vi.useFakeTimers();
        try {
            const { commitRepositoryOpen, commitRepositoryClose } = await import(
                '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow'
            );
            const layer = document.createElement('div');
            layer.setAttribute('data-testid', 'smart-repository-modal');
            document.body.appendChild(layer);

            const setIsRepositoryOpen = vi.fn();
            commitRepositoryOpen(openArgs({ setIsRepositoryOpen }));
            commitRepositoryClose({
                setIsRepositoryOpen,
                setFocusNoteId: vi.fn(),
                setVaultOpenScanner: vi.fn(),
                setRepositoryHostMounted: vi.fn(),
            });
            commitRepositoryOpen(openArgs({ setIsRepositoryOpen }));

            await vi.advanceTimersByTimeAsync(HUB_LAYER_EXIT_MS + HUB_LAYER_EXIT_PAD_MS + 8);
            expect(setIsRepositoryOpen).not.toHaveBeenCalledWith(false);
        } finally {
            vi.useRealTimers();
            document.body.innerHTML = '';
        }
    });
});
