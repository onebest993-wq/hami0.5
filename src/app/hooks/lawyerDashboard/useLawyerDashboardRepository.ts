import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openRepositoryFromShell,
    REPOSITORY_SHELL_FEATURE,
} from '@/app/services/repository/repositoryShellNavigation';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    releaseBodyScrollLock,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
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
import { loadRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
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

    const closeRepository = useCallback(() => {
        setIsRepositoryOpen(false);
        setFocusNoteId(undefined);
        setVaultOpenScanner(false);
    }, []);

    const primeRepositoryShellMount = useCallback(() => {
        warmRepositoryHubOnHover(userId ?? undefined);
    }, [userId]);

    useEffect(() => registerRepositoryWarmUserId(userId), [userId]);

    useEffect(() => {
        if (!isRealSignedIn(userId)) return;
        return scheduleIdleWork(
            () => {
                warmRepositoryHubOnHover(userId ?? undefined);
            },
            { minDelayMs: 6_000, timeoutMs: 15_000 },
        );
    }, [userId]);

    useLayoutEffect(() => {
        if (!isRepositoryOpen || repositoryOpenEpoch <= 0) return;
        markRepositoryPerfPhase('first-paint');
        markRepositoryPerfPhase('interactive');
    }, [isRepositoryOpen, repositoryOpenEpoch]);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except !== 'repository' && except !== 'notepad' && except !== 'vault') {
                setIsRepositoryOpen(false);
                setFocusNoteId(undefined);
                setVaultOpenScanner(false);
            }
            if (except == null) {
                releaseBodyScrollLock();
            }
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, []);

    const openRepository = useCallback(
        (opts?: OpenRepositoryOptions) => {
            openRepositoryFromShell({
                signedIn: isRealSignedIn(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${REPOSITORY_SHELL_FEATURE}`),
                onOpen: () => {
                    dismissTransientOverlays('repository');
                    clearRepositoryPerfMarks();
                    const tab = opts?.tab ?? 'notepad';
                    markRepositoryPerfPhase('open-request');
                    warmRepositoryOnOpen(userId, tab);
                    primeRepositoryShellMount();
                    setRepositoryTab(tab);
                    setNotepadMode(opts?.notepadMode ?? 'list');
                    setFocusNoteId(opts?.focusNoteId);
                    setVaultOpenScanner(!!opts?.scanner);
                    setRepositoryOpenEpoch((epoch) => (epoch === 0 ? 1 : epoch));
                    setIsRepositoryOpen(true);
                    void warmRepositoryDataCache(userId);
                    void loadRepositoryHubModule().catch(() => undefined);
                },
            });
        },
        [primeRepositoryShellMount, userId],
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
