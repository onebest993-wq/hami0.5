import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openRepositoryFromShell,
    REPOSITORY_SHELL_FEATURE,
} from '@/app/services/repository/repositoryShellNavigation';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { useKeepAliveIdleRelease } from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import type { RepositoryTab } from '@/app/components/lawyer/SmartRepositoryModal';
import {
    markRepositoryPerfPhase,
} from '@/app/services/repository/repositoryPerfMetrics';
import {
    loadRepositoryHubModule,
    prefetchRepositoryHubModule,
} from '@/app/runtime/repositoryHubLoader';
import {
    loadRepositoryBootHydrator,
    loadRepositoryIntentWarm,
    prefetchRepositoryOverlayChunks,
    REPOSITORY_PRIME_HOST_EVENT,
    REPOSITORY_SHELL_HYDRATED_EVENT,
} from '@/app/hooks/lawyerDashboard/repository/repositoryLazyImports';
import { commitRepositoryClose, commitRepositoryOpen } from '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow';
import { paintRepositoryInstantChrome } from '@/app/runtime/repositoryInstantPaint';

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
        commitRepositoryClose({
            setIsRepositoryOpen,
            setFocusNoteId,
            setVaultOpenScanner,
        });
    }, []);

    /** جلسة مستودع مفتوحة بلا هوية — أغلق وامسح الـ host (R2) */
    useEffect(() => {
        if (isRealSignedIn(userId)) return;
        setIsRepositoryOpen(false);
        setFocusNoteId(undefined);
        setVaultOpenScanner(false);
        setRepositoryHostMounted(false);
    }, [userId]);

    const primeRepositoryShellMount = useCallback(() => {
        prefetchRepositoryHubModule();
        prefetchRepositoryOverlayChunks();
        void loadRepositoryIntentWarm().then((m) => m.warmRepositoryHubOnHover(userId ?? undefined));
        armRepositoryHost();
    }, [armRepositoryHost, userId]);

    /** ركّب Host مخفياً فور وجود هوية — قبل أول لمسة مستودع */
    useLayoutEffect(() => {
        if (!isRealSignedIn(userId)) return;
        armRepositoryHost();
        prefetchRepositoryHubModule();
        prefetchRepositoryOverlayChunks();
        void loadRepositoryIntentWarm().then((m) => m.warmRepositoryHubOnHover(userId));
    }, [armRepositoryHost, userId]);

    useLayoutEffect(() => {
        if (isRepositoryOpen) paintRepositoryInstantChrome();
    }, [isRepositoryOpen]);

    useEffect(() => {
        let disposed = false;
        let unsub: (() => void) | undefined;
        void loadRepositoryIntentWarm().then((m) => {
            if (disposed) return;
            unsub = m.registerRepositoryWarmUserId(userId);
        });
        return () => {
            disposed = true;
            unsub?.();
        };
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

    useEffect(() => {
        let disposed = false;
        let unbind: (() => void) | undefined;
        void loadRepositoryBootHydrator().then((m) => {
            if (disposed) return;
            unbind = m.bindRepositoryBootHydrator(userId);
        });
        return () => {
            disposed = true;
            unbind?.();
        };
    }, [userId]);

    useKeepAliveIdleRelease(isRepositoryOpen, () => setRepositoryHostMounted(false));

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const scheduleWarm = () => {
            prefetchRepositoryHubModule();
            prefetchRepositoryOverlayChunks();
            void loadRepositoryIntentWarm().then((m) => {
                m.warmRepositoryHubOnHover(userId ?? undefined);
                m.scheduleRepositoryDockIdlePrefetch();
            });
            void loadRepositoryBootHydrator()
                .then((m) => m.prefetchRepositoryAfterBootReveal(userId))
                .catch(() => undefined);
        };

        return onDashboardInteractive(scheduleWarm);
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => {
            prefetchRepositoryHubModule();
            prefetchRepositoryOverlayChunks();
            void loadRepositoryHubModule().catch(() => undefined);
            void loadRepositoryBootHydrator()
                .then((m) => m.hydrateRepositoryBootShellForInstantOpen(userId, true))
                .catch(() => undefined);
            void loadRepositoryIntentWarm().then((m) => m.warmRepositoryHubOnHover(userId ?? undefined));
            armRepositoryHost();
        };
        window.addEventListener(REPOSITORY_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(REPOSITORY_PRIME_HOST_EVENT, onPrime);
    }, [armRepositoryHost, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onHydrated = () => {
            armRepositoryHost();
        };
        window.addEventListener(REPOSITORY_SHELL_HYDRATED_EVENT, onHydrated);
        return () => window.removeEventListener(REPOSITORY_SHELL_HYDRATED_EVENT, onHydrated);
    }, [armRepositoryHost]);

    const openRepository = useCallback(
        (opts?: OpenRepositoryOptions) => {
            openRepositoryFromShell({
                signedIn: isRealSignedIn(userId),
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${REPOSITORY_SHELL_FEATURE}`),
                onOpen: () => {
                    commitRepositoryOpen({
                        userId,
                        opts,
                        armRepositoryHost,
                        setRepositoryTab,
                        setNotepadMode,
                        setFocusNoteId,
                        setVaultOpenScanner,
                        setRepositoryOpenEpoch,
                        setIsRepositoryOpen,
                    });
                },
            });
        },
        [armRepositoryHost, userId],
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
