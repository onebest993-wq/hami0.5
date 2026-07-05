import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    GLOBAL_SEARCH_SHELL_FEATURE,
    openGlobalSearchFromShell,
} from '@/app/services/search/globalSearchShellNavigation';
import {
    warmGlobalSearchOnHover,
    warmGlobalSearchOnOpen,
} from '@/app/hooks/lawyerDashboard/globalSearchIntentWarm';
import { loadGlobalSearchOverlayModule, prefetchGlobalSearchSearchEngine } from '@/app/runtime/globalSearchLoader';
import { hydrateGlobalSearchShellForInstantOpen } from '@/app/runtime/globalSearchBootHydrator';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import {
    clearGlobalSearchPerfMarks,
    markGlobalSearchPerfPhase,
} from '@/app/services/search/globalSearchPerfMetrics';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';

export type UseLawyerDashboardGlobalSearchParams = {
    userId: string | null;
};

export function useLawyerDashboardGlobalSearch({ userId }: UseLawyerDashboardGlobalSearchParams) {
    const [showGlobalSearch, setShowGlobalSearch] = useState(false);
    const showGlobalSearchRef = useRef(false);
    const openInFlightRef = useRef(false);
    showGlobalSearchRef.current = showGlobalSearch;
    const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('');
    const [globalSearchSessionKey, setGlobalSearchSessionKey] = useState(0);
    const [searchIndexVersion, setSearchIndexVersion] = useState(0);

    useEffect(() => {
        if (!isRealSignedIn(userId)) return;
        warmGlobalSearchOnHover();
        void hydrateGlobalSearchShellForInstantOpen().catch(() => undefined);
        return scheduleIdleWork(
            () => {
                void hydrateGlobalSearchShellForInstantOpen().catch(() => undefined);
            },
            { minDelayMs: 0, timeoutMs: 4_000 },
        );
    }, [userId]);

    const closeGlobalSearch = useCallback(() => {
        showGlobalSearchRef.current = false;
        setShowGlobalSearch(false);
        setGlobalSearchInitialQuery('');
        setGlobalSearchSessionKey((k) => k + 1);
    }, []);

    const primeGlobalSearchShellMount = useCallback(() => {
        warmGlobalSearchOnHover();
        void hydrateGlobalSearchShellForInstantOpen().catch(() => undefined);
    }, []);

    const openGlobalSearch = useCallback(
        (seed = '') => {
            openGlobalSearchFromShell({
                signedIn: isRealSignedIn(userId),
                seed,
                onSignedOut: () =>
                    SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${GLOBAL_SEARCH_SHELL_FEATURE}`),
                onOpen: (querySeed) => {
                    if (showGlobalSearchRef.current || openInFlightRef.current) return;
                    openInFlightRef.current = true;
                    try {
                        clearGlobalSearchPerfMarks();
                        markGlobalSearchPerfPhase('open-request');
                        warmGlobalSearchOnOpen();

                        flushSync(() => {
                            setGlobalSearchInitialQuery(querySeed);
                            setShowGlobalSearch(true);
                            showGlobalSearchRef.current = true;
                        });

                        queueMicrotask(() => {
                            dismissTransientOverlays('global-search');
                            prefetchGlobalSearchSearchEngine();
                        });

                        void loadGlobalSearchOverlayModule()
                            .catch(() => undefined)
                            .then(() => markGlobalSearchPerfPhase('chunk-ready'));
                        void hydrateGlobalSearchShellForInstantOpen(true).catch(() => undefined);
                    } finally {
                        openInFlightRef.current = false;
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
        setGlobalSearchInitialQuery('');
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                if (showGlobalSearchRef.current) {
                    closeGlobalSearch();
                    return;
                }
                openGlobalSearch();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [closeGlobalSearch, openGlobalSearch]);

    useEffect(() => {
        return registerDashboardOverlayCloser('global-search', () => {
            setShowGlobalSearch(false);
            setGlobalSearchInitialQuery('');
            setGlobalSearchSessionKey((k) => k + 1);
        });
    }, []);

    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceOpenGlobalSearch?: (seed?: string) => void;
            __hamiE2eGlobalSearchDebug?: () => { showGlobalSearch: boolean };
        };
        w.__hamiE2eForceOpenGlobalSearch = (seed = '') => openGlobalSearch(seed);
        w.__hamiE2eGlobalSearchDebug = () => ({
            showGlobalSearch,
        });
        return () => {
            delete w.__hamiE2eForceOpenGlobalSearch;
            delete w.__hamiE2eGlobalSearchDebug;
        };
    }, [openGlobalSearch, showGlobalSearch]);

    return {
        showGlobalSearch,
        setShowGlobalSearch,
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
