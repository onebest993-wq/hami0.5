import { flushSync } from 'react-dom';

import type { RepositoryTab } from '@/app/components/lawyer/SmartRepositoryModal';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    clearRepositoryPerfMarks,
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';
import {
    applyRepositoryOpaqueChrome,
    concealRepositoryWarmShell,
    markRepositoryShellOpenCommitted,
    paintRepositoryInstantChrome,
} from '@/app/runtime/repositoryInstantPaint';
import {
    persistRepositorySessionOpen,
    type LawyerRepositorySessionTab,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    loadRepositoryIntentWarm,
    prefetchRepositoryHubAndOverlay,
} from '@/app/hooks/lawyerDashboard/repository/repositoryLazyImports';

let repositoryOpenRaf = 0;

function cancelRepositoryOpenRaf(): void {
    if (repositoryOpenRaf && typeof window !== 'undefined') {
        cancelAnimationFrame(repositoryOpenRaf);
    }
    repositoryOpenRaf = 0;
}

function persistRepositoryTab(tab: RepositoryTab): LawyerRepositorySessionTab {
    return tab === 'notepad' ? 'notepad' : 'vault';
}

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
};

export type CommitRepositoryCloseParams = {
    setIsRepositoryOpen: (open: boolean) => void;
    setFocusNoteId: (id: string | undefined) => void;
    setVaultOpenScanner: (open: boolean) => void;
};

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
    persistRepositorySessionOpen(true, persistRepositoryTab(tab));
}

/** فتح المستودع: طلاء DOM فوري ثم commit React (مثل الإعدادات). */
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
}: CommitRepositoryOpenParams): void {
    try {
        if (typeof performance !== 'undefined') {
            clearRepositoryPerfMarks();
            markRepositoryPerfPhase('open-request');
        }
    } catch {
        /* ignore */
    }

    prefetchRepositoryHubAndOverlay();
    markRepositoryShellOpenCommitted(true);
    applyRepositoryOpaqueChrome();

    void loadRepositoryIntentWarm()
        .then((m) => m.warmRepositoryOnOpen(userId, opts?.tab ?? 'notepad'))
        .catch(() => undefined);
    void loadRepositoryIntentWarm()
        .then((m) => m.warmRepositoryDataCache(userId))
        .catch(() => undefined);

    const revealed = paintRepositoryInstantChrome();

    const commitOpen = () => {
        applyRepositoryOpenState(opts, {
            armRepositoryHost,
            setRepositoryTab,
            setNotepadMode,
            setFocusNoteId,
            setVaultOpenScanner,
            setRepositoryOpenEpoch,
            setIsRepositoryOpen,
        });
    };

    if (revealed) {
        if (typeof window !== 'undefined') {
            cancelRepositoryOpenRaf();
            repositoryOpenRaf = window.requestAnimationFrame(() => {
                repositoryOpenRaf = 0;
                commitOpen();
            });
        } else {
            commitOpen();
        }
    } else {
        cancelRepositoryOpenRaf();
        flushSync(commitOpen);
        paintRepositoryInstantChrome();
    }

    queueMicrotask(() => dismissTransientOverlays('repository'));
}

/** إغلاق المستودع: إخفاء فوري ثم setState في الإطار التالي */
export function commitRepositoryClose({
    setIsRepositoryOpen,
    setFocusNoteId,
    setVaultOpenScanner,
}: CommitRepositoryCloseParams): void {
    cancelRepositoryOpenRaf();
    concealRepositoryWarmShell();
    persistRepositorySessionOpen(false);

    flushSync(() => {
        setIsRepositoryOpen(false);
        setFocusNoteId(undefined);
        setVaultOpenScanner(false);
    });
}
