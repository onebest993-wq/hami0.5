import { flushSync } from 'react-dom';

import type { RepositoryTab } from '@/app/components/lawyer/SmartRepositoryModal';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { executeRepositoryOverlayClose } from '@/app/runtime/overlaySnapClose';
import { beginHubLayerExit, clearHubLayerClosing } from '@/app/runtime/overlayHubLayerMotion';
import { REPOSITORY_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import { persistRepositorySessionOpen } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { blurFocusWithin } from '@/app/utils/inertProps';
import {
    clearRepositoryPerfMarks,
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';
import {
    applyRepositoryOpenTheme,
    concealRepositoryWarmShell,
    paintRepositoryInstantChrome,
    REPOSITORY_INSTANT_DISMISS_EVENT,
} from '@/app/runtime/repositoryInstantPaint';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import {
    isRepositoryHubModuleResolved,
    loadRepositoryHubModule,
    prefetchRepositoryHubModule,
} from '@/app/runtime/repositoryHubLoader';
import { loadRepositoryIntentWarm } from '@/app/hooks/lawyerDashboard/repository/repositoryLazyImports';

export type OpenRepositoryShellOptions = {
    tab?: RepositoryTab;
    notepadMode?: 'list' | 'create';
    focusNoteId?: string;
    scanner?: boolean;
};

export type CommitRepositoryOpenParams = {
    userId: string | null;
    opts?: OpenRepositoryShellOptions;
    armRepositoryHost: () => void;
    setRepositoryTab: (tab: RepositoryTab) => void;
    setNotepadMode: (mode: 'list' | 'create') => void;
    setFocusNoteId: (id: string | undefined) => void;
    setVaultOpenScanner: (open: boolean) => void;
    setRepositoryOpenEpoch: (updater: (epoch: number) => number) => void;
    setIsRepositoryOpen: (open: boolean) => void;
    hostAlreadyMounted?: boolean;
    isRepositoryOpen?: boolean;
    onChunkFailed?: () => void;
};

export type CommitRepositoryCloseParams = {
    setIsRepositoryOpen: (open: boolean) => void;
    setFocusNoteId: (id: string | undefined) => void;
    setVaultOpenScanner: (open: boolean) => void;
    setRepositoryHostMounted: (mounted: boolean) => void;
};

const REPOSITORY_MODAL_SELECTOR = '[data-testid="smart-repository-modal"]';
const REPOSITORY_OVERLAY_ENTRY_FAILSAFE_MS = 3_000;

let repoShellOpenSessionCounter = 0;
let lastActiveRepoShellId = 0;
const repoShellSessionIdRef: { current: number } = { current: 0 };
const repoShellActiveSessionIdRef: { current: number } = { current: 0 };

let repositoryOpenLoadSeq = 0;
let repositoryOpenInFlight = false;
let repositoryInstantDismissBound = false;

export function isRepositoryOpenInFlight(): boolean {
    return repositoryOpenInFlight;
}

export function resetRepositoryOpenFlow(): void {
    repositoryOpenInFlight = false;
    repositoryOpenLoadSeq += 1;
}

/** للاختبارات — يصفّر حارس الفتح الجاري بعد إلغاء معلّق */
export function resetRepositoryOpenFlowForTests(): void {
    resetRepositoryOpenFlow();
}

function bindRepositoryInstantDismissCancel(): void {
    if (repositoryInstantDismissBound || typeof window === 'undefined') return;
    repositoryInstantDismissBound = true;
    window.addEventListener(REPOSITORY_INSTANT_DISMISS_EVENT, () => {
        repositoryOpenInFlight = false;
        repositoryOpenLoadSeq += 1;
    });
}

function armRepositoryOpenPendingDismiss(cancelled: { current: boolean }): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    let disarmed = false;
    const finish = () => {
        cancelled.current = true;
        repositoryOpenInFlight = false;
        repositoryOpenLoadSeq += 1;
        concealRepositoryWarmShell();
        disarm();
    };

    const onKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        finish();
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener(REPOSITORY_INSTANT_DISMISS_EVENT, finish);
    const unregisterNativeBack = registerNativeBackHandler(() => {
        finish();
        return true;
    });

    const disarm = () => {
        if (disarmed) return;
        disarmed = true;
        window.removeEventListener('keydown', onKey, true);
        window.removeEventListener(REPOSITORY_INSTANT_DISMISS_EVENT, finish);
        unregisterNativeBack();
    };

    return disarm;
}

function applyRepositoryOpenState(
    opts: OpenRepositoryShellOptions | undefined,
    setters: Pick<
        CommitRepositoryOpenParams,
        | 'setRepositoryTab'
        | 'setNotepadMode'
        | 'setFocusNoteId'
        | 'setVaultOpenScanner'
        | 'setRepositoryOpenEpoch'
        | 'setIsRepositoryOpen'
        | 'armRepositoryHost'
    >,
): void {
    const tab = opts?.tab ?? 'notepad';
    setters.armRepositoryHost();
    setters.setRepositoryTab(tab);
    setters.setNotepadMode(opts?.notepadMode ?? 'list');
    setters.setFocusNoteId(opts?.focusNoteId);
    setters.setVaultOpenScanner(!!opts?.scanner);
    setters.setRepositoryOpenEpoch((epoch) => (epoch === 0 ? 1 : epoch));
    setters.setIsRepositoryOpen(true);
    markRepositoryPerfPhase('first-paint');
}

/**
 * فتح المستودع: إن كان Host/المقطع جاهزاً يُكشف الحي في نفس النقرة بلا قشرة انتظار.
 * إن لم يكتمل المقطع: ثيم + قشرة إلغاء فقط حتى يصل الحي — لا flushSync فوق Suspense.
 * أثناء الانتظار: Escape/Cap/إغلاق القشرة يلغي الفتح.
 */
export function commitRepositoryOpen({
    userId,
    opts,
    armRepositoryHost,
    setRepositoryTab,
    setNotepadMode,
    setFocusNoteId,
    setVaultOpenScanner,
    setRepositoryOpenEpoch,
    setIsRepositoryOpen,
    hostAlreadyMounted = false,
    isRepositoryOpen = false,
    onChunkFailed,
}: CommitRepositoryOpenParams): void {
    /** REPOSITORY_OWNERSHIP_GUARD — L2 Session !userId early return before any work */
    if (!userId) {
        return;
    }
    if (repositoryOpenInFlight) return;
    repoShellOpenSessionCounter += 1;
    lastActiveRepoShellId = repoShellOpenSessionCounter;
    repoShellSessionIdRef.current = repoShellOpenSessionCounter;
    repoShellActiveSessionIdRef.current = repoShellOpenSessionCounter;
    bindRepositoryInstantDismissCancel();
    const wasClosing =
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute(REPOSITORY_HUB_LAYER.closingAttr) === '1';
    clearHubLayerClosing(REPOSITORY_HUB_LAYER);
    if (isRepositoryOpen && hostAlreadyMounted) {
        if (wasClosing) paintRepositoryInstantChrome();
        return;
    }

    try {
        if (typeof performance !== 'undefined') {
            clearRepositoryPerfMarks();
            markRepositoryPerfPhase('open-request');
        }
    } catch {
        /* ignore */
    }

    dismissTransientOverlays('repository');
    prefetchRepositoryHubModule();
    applyRepositoryOpenTheme();

    const reveal = () => {
        if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
        repositoryOpenInFlight = false;

        flushSync(() => {
            if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
            applyRepositoryOpenState(opts, {
                armRepositoryHost,
                setRepositoryTab,
                setNotepadMode,
                setFocusNoteId,
                setVaultOpenScanner,
                setRepositoryOpenEpoch,
                setIsRepositoryOpen,
            });
            persistRepositorySessionOpen(true, opts?.tab ?? 'notepad');
        });
        if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
        paintRepositoryInstantChrome();
        markRepositoryPerfPhase('interactive');

        void loadRepositoryHubModule()
            .then(() => {
                if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
                void loadRepositoryIntentWarm()
                    .then((m) => {
                        if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
                        void m.warmRepositoryOnOpen(userId, opts?.tab ?? 'notepad');
                        void m.warmRepositoryDataCache(userId);
                    })
                    .catch(() => undefined);
            })
            .catch(() => {
                if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
                /*
                 * تنبيه فقط — والقشرة تبقى مفتوحة.
                 *
                 * كان هنا `tearDownRepoFloatingState({ reason: 'tearDown' })`، وهو
                 * يستدعي `p7ChromeSnap` فيُخفي القشرة الدافئة ويزيل زينة الرسم
                 * الفوري. والنتيجة أسوأ من الطرفين: قشرة مفتوحة (reveal استدعى
                 * `setIsRepositoryOpen(true)` قبلها)، بزينة منزوعة، بلا محتوى
                 * لأن المقطع لم يُحمَّل.
                 *
                 * والمستدعي الوحيد يقول ما هو مقصود صراحةً:
                 *     onChunkFailed: () => SmartToast.error(`تعذّر تحميل …`)
                 * تنبيهٌ ولا إغلاق — فالمستخدم يُعيد المحاولة أو يُغلق بنفسه،
                 * والإغلاق حينها يمرّ بمسار الإغلاق الذي يُفكّك كما ينبغي.
                 *
                 * وتفكيكُ حالةٍ عائمة لسطحٍ **ما زال مفتوحاً** خطأ في ذاته: كل
                 * قيم `reason` المتاحة عن المغادرة (`navigate-away` · `unmount` ·
                 * `idle-release`)، وتنفيذه هنا يُبطل مكدّس Escape للقشرة القائمة.
                 *
                 * الادّعاء `concealMock` كُتب في 3b9b03bc، وأُدخل التفكيك بعده في
                 * commit التجميع 065d18a2 بلا تعليل مخصَّص — فكسره ومرّ غير مقروء.
                 */
                onChunkFailed?.();
            });
    };

    const hostInDom =
        typeof document !== 'undefined' && Boolean(document.querySelector(REPOSITORY_MODAL_SELECTOR));
    const canRevealLive =
        hostAlreadyMounted || hostInDom || isRepositoryHubModuleResolved();

    if (canRevealLive) {
        reveal();
        return;
    }

    paintRepositoryInstantChrome();

    repositoryOpenInFlight = true;
    const seq = ++repositoryOpenLoadSeq;
    const cancelled = { current: false };
    const disarmPending = armRepositoryOpenPendingDismiss(cancelled);
    let failSafeId = 0;
    let settled = false;
    const finishPending = (next: () => void) => {
        if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
        if (failSafeId) {
            window.clearTimeout(failSafeId);
            failSafeId = 0;
        }
        disarmPending();
        next();
    };
    const revealOnce = () => {
        if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
        if (settled || cancelled.current || seq !== repositoryOpenLoadSeq) return;
        settled = true;
        reveal();
    };

    failSafeId = window.setTimeout(() => {
        if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
        failSafeId = 0;
        finishPending(revealOnce);
    }, REPOSITORY_OVERLAY_ENTRY_FAILSAFE_MS);

    void loadRepositoryHubModule()
        .then(() => {
            if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
            finishPending(revealOnce);
        })
        .catch(() => {
            if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
            finishPending(revealOnce);
        });
}

/** إغلاق المستودع: إخفاء فوري + commit متزامن */
export function commitRepositoryClose({
    setIsRepositoryOpen,
    setFocusNoteId,
    setVaultOpenScanner,
    setRepositoryHostMounted,
}: CommitRepositoryCloseParams): void {
    repositoryOpenInFlight = false;
    repositoryOpenLoadSeq += 1;
    beginHubLayerExit(REPOSITORY_HUB_LAYER, () => {
        executeRepositoryOverlayClose({
            conceal: () => {
                if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
                if (typeof document !== 'undefined') {
                    const modal = document.querySelector(REPOSITORY_MODAL_SELECTOR);
                    blurFocusWithin(modal instanceof HTMLElement ? modal : null);
                }
                concealRepositoryWarmShell();
            },
            commit: () => {
                if (repoShellSessionIdRef.current !== repoShellActiveSessionIdRef.current) return;
                flushSync(() => {
                    setIsRepositoryOpen(false);
                    setFocusNoteId(undefined);
                    setVaultOpenScanner(false);
                    setRepositoryHostMounted(false);
                    persistRepositorySessionOpen(false);
                });
            },
        });
    });
    repoShellActiveSessionIdRef.current = 0;
    try {
        void import('@/app/services/repository/tearDownRepoFloatingState').then(({ tearDownRepoFloatingState }) => {
            tearDownRepoFloatingState({ targetSurface: 'repository-shell', reason: 'unmount' });
        });
    } catch {
        /* never throw on tail teardown */
    }
}
