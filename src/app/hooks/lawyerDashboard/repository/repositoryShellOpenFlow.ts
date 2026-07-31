import { flushSync } from 'react-dom';

import type { RepositoryTab } from '@/app/components/lawyer/SmartRepositoryModal';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import {
    clearRepositoryPerfMarks,
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';
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

/** فتح المستودع: perf marks متزامنة + prefetch فوري + flushSync. */
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

    const tab = opts?.tab ?? 'notepad';
    prefetchRepositoryHubAndOverlay();

    flushSync(() => {
        armRepositoryHost();
        setRepositoryTab(tab);
        setNotepadMode(opts?.notepadMode ?? 'list');
        setFocusNoteId(opts?.focusNoteId);
        setVaultOpenScanner(!!opts?.scanner);
        setRepositoryOpenEpoch((epoch) => (epoch === 0 ? 1 : epoch));
        setIsRepositoryOpen(true);
    });

    queueMicrotask(() => dismissTransientOverlays('repository'));
    void loadRepositoryIntentWarm()
        .then((m) => m.warmRepositoryOnOpen(userId, tab))
        .catch(() => undefined);
    void loadRepositoryIntentWarm()
        .then((m) => m.warmRepositoryDataCache(userId))
        .catch(() => undefined);
}
