import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import {
    GLOBAL_SEARCH_SHELL_FEATURE,
    openGlobalSearchFromShell,
} from '@/app/services/search/globalSearchShellNavigation';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import {
    persistGlobalSearchSessionOpen,
    readInitialGlobalSearchSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    concealGlobalSearchWarmShell,
    GLOBAL_SEARCH_INSTANT_DISMISS_EVENT,
    paintGlobalSearchInstantChrome,
    revealGlobalSearchWarmShell,
} from '@/app/runtime/globalSearchInstantPaint';
import { executeGlobalSearchOverlayClose } from '@/app/runtime/overlaySnapClose';
import { snapGlobalSearchShellClose } from '@/app/services/search/globalSearchShellSnap';
import { clearGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import { commitGlobalSearchShellOpen } from '@/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow';
import { beginGlobalSearchShellExit } from '@/app/hooks/lawyerDashboard/globalSearch/globalSearchShellExit';
import {
    useGlobalSearchHostLifecycle,
    usePrimeGlobalSearchShellMount,
} from '@/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchHostLifecycle';
import { useGlobalSearchKeyboardShortcut } from '@/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchKeyboardShortcut';
import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';

export type UseLawyerDashboardGlobalSearchParams = {
    userId: string | null;
};

export function useLawyerDashboardGlobalSearch({ userId }: UseLawyerDashboardGlobalSearchParams) {
    const [initialSession] = useState(() => readInitialGlobalSearchSession());
    const [showGlobalSearch, setShowGlobalSearch] = useState(() => initialSession.open);
    const [searchHostMounted, setSearchHostMounted] = useState(() => initialSession.open);
    const showGlobalSearchRef = useRef(initialSession.open);
    const openInFlightRef = useRef(false);
    const closingRef = useRef(false);
    showGlobalSearchRef.current = showGlobalSearch;
    const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('');
    const [globalSearchSessionKey, setGlobalSearchSessionKey] = useState(0);
    const [searchIndexVersion, setSearchIndexVersion] = useState(0);

    const closeGlobalSearch = useCallback(() => {
        if (closingRef.current) return;
        closingRef.current = true;
        openInFlightRef.current = false;
        beginGlobalSearchShellExit(() => {
            showGlobalSearchRef.current = false;
            executeGlobalSearchOverlayClose({
                conceal: () => {
                    concealGlobalSearchWarmShell();
                    snapGlobalSearchShellClose();
                },
                commit: () => {
                    setShowGlobalSearch(false);
                    setSearchHostMounted(false);
                    setGlobalSearchInitialQuery('');
                    setGlobalSearchSessionKey((k) => k + 1);
                    persistGlobalSearchSessionOpen(false);
                    clearGlobalSearchDraftQuery();
                    closingRef.current = false;
                },
            });
        });
    }, []);

    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
        if (!showGlobalSearchRef.current && !initialSession.open && !searchHostMounted) return;
        closeGlobalSearch();
        setSearchHostMounted(false);
    }, [userId, initialSession.open, searchHostMounted, closeGlobalSearch]);

    useGlobalSearchHostLifecycle({
        userId,
        initialSessionOpen: initialSession.open,
    });

    const primeGlobalSearchShellMount = usePrimeGlobalSearchShellMount();

    const openGlobalSearch = useCallback(
        (seed = '') => {
            openGlobalSearchFromShell({
                signedIn: hasLocalAppSession(userId),
                seed,
                onSignedOut: () => {
                    concealGlobalSearchWarmShell();
                    snapGlobalSearchShellClose();
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${GLOBAL_SEARCH_SHELL_FEATURE}`);
                },
                onOpen: (querySeed) => {
                    if (showGlobalSearchRef.current) {
                        paintGlobalSearchInstantChrome();
                        revealGlobalSearchWarmShell();
                        return;
                    }
                    if (openInFlightRef.current) return;
                    openInFlightRef.current = true;
                    showGlobalSearchRef.current = true;
                    try {
                        commitGlobalSearchShellOpen({
                            querySeed,
                            showGlobalSearchRef,
                            setSearchHostMounted,
                            setGlobalSearchInitialQuery,
                            setShowGlobalSearch,
                        });
                    } finally {
                        queueMicrotask(() => {
                            openInFlightRef.current = false;
                        });
                    }
                },
            });
        },
        [userId],
    );

    const bumpSearchIndex = useCallback(() => {
        setSearchIndexVersion((v) => v + 1);
    }, []);

    const resetGlobalSearchShell = useCallback(() => {
        setGlobalSearchSessionKey((k) => k + 1);
        setShowGlobalSearch(false);
        setSearchHostMounted(false);
        setGlobalSearchInitialQuery('');
        persistGlobalSearchSessionOpen(false);
    }, []);

    useEffect(() => {
        persistGlobalSearchSessionOpen(showGlobalSearch);
    }, [showGlobalSearch]);

    useGlobalSearchKeyboardShortcut(showGlobalSearchRef, openGlobalSearch, closeGlobalSearch);

    useEffect(() => {
        return registerDashboardOverlayCloser('global-search', () => {
            closeGlobalSearch();
        });
    }, [closeGlobalSearch]);

    useEffect(() => {
        if (typeof window === 'undefined') return undefined;
        const onInstantDismiss = () => {
            closeGlobalSearch();
        };
        window.addEventListener(GLOBAL_SEARCH_INSTANT_DISMISS_EVENT, onInstantDismiss);
        return () => {
            window.removeEventListener(GLOBAL_SEARCH_INSTANT_DISMISS_EVENT, onInstantDismiss);
        };
    }, [closeGlobalSearch]);

    useEffect(() => {
        if (!isViteE2eHooksEnabled() || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceCloseGlobalSearch?: () => void;
            __hamiE2eForceOpenGlobalSearch?: (seed?: string) => void;
            __hamiE2eGlobalSearchDebug?: () => { showGlobalSearch: boolean };
        };
        w.__hamiE2eForceCloseGlobalSearch = () => {
            openInFlightRef.current = false;
            closeGlobalSearch();
        };
        w.__hamiE2eForceOpenGlobalSearch = (seed = '') => {
            dismissTransientOverlays('global-search');
            openInFlightRef.current = false;
            if (showGlobalSearchRef.current) {
                concealGlobalSearchWarmShell();
                snapGlobalSearchShellClose();
                showGlobalSearchRef.current = false;
                setShowGlobalSearch(false);
                persistGlobalSearchSessionOpen(false);
                clearGlobalSearchDraftQuery();
            }
            commitGlobalSearchShellOpen({
                querySeed: seed,
                showGlobalSearchRef,
                setSearchHostMounted,
                setGlobalSearchInitialQuery,
                setShowGlobalSearch,
            });
        };
        w.__hamiE2eGlobalSearchDebug = () => ({
            showGlobalSearch,
        });
        return () => {
            delete w.__hamiE2eForceCloseGlobalSearch;
            delete w.__hamiE2eForceOpenGlobalSearch;
            delete w.__hamiE2eGlobalSearchDebug;
        };
    }, [
        closeGlobalSearch,
        setGlobalSearchInitialQuery,
        setSearchHostMounted,
        setShowGlobalSearch,
        showGlobalSearch,
    ]);

    return {
        showGlobalSearch,
        setShowGlobalSearch,
        searchHostMounted,
        globalSearchInitialQuery,
        setGlobalSearchInitialQuery,
        globalSearchSessionKey,
        primeGlobalSearchShellMount,
        searchIndexVersion,
        setSearchIndexVersion,
        bumpSearchIndex,
        resetGlobalSearchShell,
        openGlobalSearch,
        closeGlobalSearch,
    };
}

export type LawyerDashboardGlobalSearchState = ReturnType<typeof useLawyerDashboardGlobalSearch>;
export type SetShowGlobalSearch = Dispatch<SetStateAction<boolean>>;
