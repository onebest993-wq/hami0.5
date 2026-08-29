import { useCallback, useEffect, useLayoutEffect, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
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
import { prefetchRepositoryHubModule } from '@/app/runtime/repositoryHubLoader';
import {
    loadRepositoryBootHydrator,
    loadRepositoryIntentWarm,
    REPOSITORY_PRIME_HOST_EVENT,
} from '@/app/hooks/lawyerDashboard/repository/repositoryLazyImports';
import {
    persistRepositorySessionOpen,
    readInitialRepositorySession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { commitRepositoryClose, commitRepositoryOpen } from '@/app/hooks/lawyerDashboard/repository/repositoryShellOpenFlow';
import {
    concealRepositoryWarmShell,
    isRepositoryShellPaintedOpen,
    paintRepositoryInstantChrome,
} from '@/app/runtime/repositoryInstantPaint';
import { deferShellConcealAfterHandoff, isShellHandoffPending } from '@/app/runtime/sectionShellHandoff';
import { isSectionBackgroundPrefetchAllowed } from '@/app/runtime/sectionPrefetchPolicy';

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
    useState(() => readInitialRepositorySession());
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
            setRepositoryHostMounted,
        });
    }, []);

    /** جلسة مستودع مفتوحة بلا هوية — أغلق وامسح الـ host (R2) */
    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
        concealRepositoryWarmShell();
        setIsRepositoryOpen(false);
        setFocusNoteId(undefined);
        setVaultOpenScanner(false);
        setRepositoryHostMounted(false);
        persistRepositorySessionOpen(false);
    }, [userId]);

    /** لمسة البلاطة: تسخين بلا تركيب Host حتى الفتح */
    const primeRepositoryShellMount = useCallback(() => {
        prefetchRepositoryHubModule();
        void loadRepositoryIntentWarm().then((m) => m.warmRepositoryHubOnHover(userId ?? undefined));
    }, [userId]);

    /** تسخين المقطع فور وجود هوية — بلا تركيب Host حتى الفتح */
    useLayoutEffect(() => {
        if (!hasLocalAppSession(userId)) return;
        if (isSectionBackgroundPrefetchAllowed()) {
            prefetchRepositoryHubModule();
            void loadRepositoryIntentWarm().then((m) => m.warmRepositoryHubOnHover(userId));
        }
    }, [userId]);

    useLayoutEffect(() => {
        if (isRepositoryOpen) {
            paintRepositoryInstantChrome();
            return;
        }
        return deferShellConcealAfterHandoff(() => {
            if (isShellHandoffPending('repository')) return;
            if (isRepositoryShellPaintedOpen()) concealRepositoryWarmShell();
        });
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
        return registerDashboardOverlayCloser('repository', closeRepository);
    }, [closeRepository]);

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
            if (isSectionBackgroundPrefetchAllowed()) {
                prefetchRepositoryHubModule();
                void loadRepositoryIntentWarm().then((m) => {
                    m.warmRepositoryHubOnHover(userId ?? undefined);
                    m.scheduleRepositoryDockIdlePrefetch();
                });
            }
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
            void loadRepositoryBootHydrator()
                .then((m) => m.hydrateRepositoryBootShellForInstantOpen(userId, true))
                .catch(() => undefined);
            void loadRepositoryIntentWarm().then((m) => m.warmRepositoryHubOnHover(userId ?? undefined));
        };
        window.addEventListener(REPOSITORY_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(REPOSITORY_PRIME_HOST_EVENT, onPrime);
    }, [userId]);

    const openRepository = useCallback(
        (opts?: OpenRepositoryOptions) => {
            openRepositoryFromShell({
                signedIn: hasLocalAppSession(userId),
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
        concealRepositoryWarmShell();
        setIsRepositoryOpen(false);
        setFocusNoteId(undefined);
        setVaultOpenScanner(false);
        setRepositoryHostMounted(false);
        persistRepositorySessionOpen(false);
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
