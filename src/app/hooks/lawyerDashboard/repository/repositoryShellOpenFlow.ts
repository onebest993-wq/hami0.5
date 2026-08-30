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
    applyRepositoryOpaqueChrome,
    concealRepositoryWarmShell,
    paintRepositoryInstantChrome,
    REPOSITORY_INSTANT_DISMISS_EVENT,
} from '@/app/runtime/repositoryInstantPaint';
import {
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
 * فتح المستودع في نفس النقرة: قشرة فورية + Host.
 * المقطع يُحمَّل بالتوازي — لا ننتظر تسخين الإقلاع.
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
    if (repositoryOpenInFlight) return;
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
    applyRepositoryOpaqueChrome();
    paintRepositoryInstantChrome();

    void loadRepositoryHubModule()
        .then(() => {
            void loadRepositoryIntentWarm()
                .then((m) => {
                    void m.warmRepositoryOnOpen(userId, opts?.tab ?? 'notepad');
                    void m.warmRepositoryDataCache(userId);
                })
                .catch(() => undefined);
        })
        .catch(() => {
            onChunkFailed?.();
        });

    flushSync(() => {
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
    paintRepositoryInstantChrome();
    markRepositoryPerfPhase('interactive');
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
                if (typeof document !== 'undefined') {
                    const modal = document.querySelector(REPOSITORY_MODAL_SELECTOR);
                    blurFocusWithin(modal instanceof HTMLElement ? modal : null);
                }
                concealRepositoryWarmShell();
            },
            commit: () => {
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
}
