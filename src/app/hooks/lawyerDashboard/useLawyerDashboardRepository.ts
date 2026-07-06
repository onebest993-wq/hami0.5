import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openRepositoryFromShell,
    REPOSITORY_SHELL_FEATURE,
} from '@/app/services/repository/repositoryShellNavigation';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import {
    clearRepositoryPerfMarks,
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';
import {
    warmRepositoryDataCache,
    warmRepositoryHubOnHover,
    warmRepositoryOnOpen,
    registerRepositoryWarmUserId,
} from '@/app/hooks/lawyerDashboard/repositoryIntentWarm';
import {
    hydrateRepositoryBootShellForInstantOpen,
} from '@/app/runtime/repositoryBootHydrator';
import { loadRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import type { RepositoryTab } from '@/app/components/lawyer/SmartRepositoryModal';

/** @deprecated use OpenRepositoryOptions — kept for navigation typings */
export type OpenNotepadOptions = {
    mode?: 'list' | 'create';
    focusNoteId?: string;
};

export type OpenRepositoryOptions = {
    tab?: RepositoryTab;
    notepadMode?: 'list' | 'create';
    focusNoteId?: string;
    scanner?: boolean;
};

export type UseLawyerDashboardRepositoryParams = {
    userId: string | null;
};

export function useLawyerDashboardRepository({ userId }: UseLawyerDashboardRepositoryParams) {
    const [isRepositoryOpen, setIsRepositoryOpen] = useState(false);
    const [repositoryTab, setRepositoryTab] = useState<RepositoryTab>('notepad');
    const [notepadMode, setNotepadMode] = useState<'list' | 'create'>('list');
    const [focusNoteId, setFocusNoteId] = useState<string | undefined>();
    const [vaultOpenScanner, setVaultOpenScanner] = useState(false);
    const [repositorySessionKey, setRepositorySessionKey] = useState(0);
    const [repositoryOpenEpoch, setRepositoryOpenEpoch] = useState(0);
    const [repositoryHostMounted, setRepositoryHostMounted] = useState(false);

    const armRepositoryHost = useCallback(() => {
        setRepositoryHostMounted(true);
    }, []);

    const closeRepository = useCallback(() => {
        flushSync(() => {
            setIsRepositoryOpen(false);
            setFocusNoteId(undefined);
            setVaultOpenScanner(false);
        });
    }, []);

    const primeRepositoryShellMount = useCallback(() => {
        warmRepositoryHubOnHover(userId ?? undefined);
        armRepositoryHost();
    }, [armRepositoryHost, userId]);

    useEffect(() => {
        return registerRepositoryWarmUserId(userId);
    }, [userId]);

    useLayoutEffect(() => {
        if (!isRepositoryOpen || repositoryOpenEpoch <= 0) return;
        markRepositoryPerfPhase('first-paint');
        markRepositoryPerfPhase('interactive');
    }, [isRepositoryOpen, repositoryOpenEpoch]);

    useEffect(() => {
        return registerDashboardOverlayCloser('repository', () => {
            setIsRepositoryOpen(false);
            setFocusNoteId(undefined);
            setVaultOpenScanner(false);
        });
    }, []);

    useKeepAliveIdleRelease(isRepositoryOpen, () => setRepositoryHostMounted(false));

    const openRepository = useCallback(
        (opts?: OpenRepositoryOptions) => {
            openRepositoryFromShell({
                signedIn: isRealSignedIn(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${REPOSITORY_SHELL_FEATURE}`),
                onOpen: () => {
                    clearRepositoryPerfMarks();
                    const tab = opts?.tab ?? 'notepad';
                    markRepositoryPerfPhase('open-request');

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
                    warmRepositoryOnOpen(userId, tab);
                    primeRepositoryShellMount();
                    void warmRepositoryDataCache(userId).catch(() => undefined);
                    void hydrateRepositoryBootShellForInstantOpen(userId, true).catch(() => undefined);
                    void loadRepositoryHubModule().catch(() => undefined);
                },
            });
        },
        [armRepositoryHost, primeRepositoryShellMount, userId],
    );

    const resetRepositoryShell = useCallback(() => {
        setRepositorySessionKey((key) => key + 1);
        setRepositoryOpenEpoch(0);
    }, []);

    const openNotepad = useCallback(
        (opts?: { mode?: 'list' | 'create'; focusNoteId?: string }) => {
            openRepository({
                tab: 'notepad',
                notepadMode: opts?.mode,
                focusNoteId: opts?.focusNoteId,
            });
        },
        [openRepository],
    );

    const openVaultModal = useCallback(
        (opts?: { scanner?: boolean }) => {
            openRepository({ tab: 'vault', scanner: opts?.scanner });
        },
        [openRepository],
    );

    return {
        isRepositoryOpen,
        repositoryTab,
        notepadMode,
        focusNoteId,
        vaultOpenScanner,
        repositorySessionKey,
        repositoryHostMounted,
        primeRepositoryShellMount,
        resetRepositoryShell,
        openRepository,
        openNotepad,
        openVaultModal,
        closeRepository,
        isNotepadOpen: isRepositoryOpen,
        closeNotepad: closeRepository,
        showDocs: isRepositoryOpen,
        closeVault: closeRepository,
        primeNotepadShellMount: primeRepositoryShellMount,
        primeVaultShellMount: primeRepositoryShellMount,
        notepadSessionKey: repositorySessionKey,
        vaultSessionKey: repositorySessionKey,
    };
}
