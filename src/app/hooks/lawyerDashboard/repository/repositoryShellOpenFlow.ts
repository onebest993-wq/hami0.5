import { flushSync } from 'react-dom';

import type { RepositoryTab } from '@/app/components/lawyer/SmartRepositoryModal';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';
import {
    clearRepositoryPerfMarks,
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';
import {
    applyRepositoryOpaqueChrome,
    concealRepositoryWarmShell,
    paintRepositoryInstantChrome,
} from '@/app/runtime/repositoryInstantPaint';
import {
    loadRepositoryIntentWarm,
    prefetchRepositoryHubAndOverlay,
} from '@/app/hooks/lawyerDashboard/repository/repositoryLazyImports';

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

    dismissTransientOverlays('repository');

    prefetchRepositoryHubAndOverlay();
    applyRepositoryOpaqueChrome();

    void loadRepositoryIntentWarm()
        .then((m) => {
            void m.warmRepositoryOnOpen(userId, opts?.tab ?? 'notepad');
            void m.warmRepositoryDataCache(userId);
        })
        .catch(() => undefined);

    paintRepositoryInstantChrome();

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
    });
}

/** إغلاق المستودع: إخفاء فوري + commit متزامن */
export function commitRepositoryClose({
    setIsRepositoryOpen,
    setFocusNoteId,
    setVaultOpenScanner,
}: CommitRepositoryCloseParams): void {
    executeOverlaySnapClose({
        conceal: concealRepositoryWarmShell,
        commit: () => {
            setIsRepositoryOpen(false);
            setFocusNoteId(undefined);
            setVaultOpenScanner(false);
        },
    });
}
