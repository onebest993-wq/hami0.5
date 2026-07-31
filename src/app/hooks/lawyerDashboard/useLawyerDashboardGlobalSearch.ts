import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
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
} from '@/app/runtime/globalSearchInstantPaint';
import { clearGlobalSearchDraftQuery } from '@/app/runtime/globalSearchDraftQuery';
import { commitGlobalSearchShellOpen } from '@/app/hooks/lawyerDashboard/globalSearch/globalSearchShellOpenFlow';
import {
    useGlobalSearchHostLifecycle,
    usePrimeGlobalSearchShellMount,
} from '@/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchHostLifecycle';
import { useGlobalSearchKeyboardShortcut } from '@/app/hooks/lawyerDashboard/globalSearch/useGlobalSearchKeyboardShortcut';

export type UseLawyerDashboardGlobalSearchParams = {
    userId: string | null;
};

export function useLawyerDashboardGlobalSearch({ userId }: UseLawyerDashboardGlobalSearchParams) {
    const [initialSession] = useState(() => readInitialGlobalSearchSession());
    const [showGlobalSearch, setShowGlobalSearch] = useState(() => initialSession.open);
    const [searchHostMounted, setSearchHostMounted] = useState(() => initialSession.open);
    const showGlobalSearchRef = useRef(initialSession.open);
    const openInFlightRef = useRef(false);
    showGlobalSearchRef.current = showGlobalSearch;
    const [globalSearchInitialQuery, setGlobalSearchInitialQuery] = useState('');
    const [globalSearchSessionKey, setGlobalSearchSessionKey] = useState(0);
    const [searchIndexVersion, setSearchIndexVersion] = useState(0);

    const closeGlobalSearch = useCallback(() => {
        showGlobalSearchRef.current = false;
        concealGlobalSearchWarmShell();
        clearGlobalSearchDraftQuery();
        setShowGlobalSearch(false);
        /* لا تُسقط searchHostMounted — الطبقة الدافئة تبقى لفتح تالٍ فوري */
        setGlobalSearchInitialQuery('');
        setGlobalSearchSessionKey((k) => k + 1);
        persistGlobalSearchSessionOpen(false);
        /* useBodyScrollLock(open) يحرّر قفل البحث — لا releaseBodyScrollLock العام */
    }, []);

    useEffect(() => {
        if (isRealSignedIn(userId)) return;
        if (!showGlobalSearchRef.current && !initialSession.open && !searchHostMounted) return;
        closeGlobalSearch();
        setSearchHostMounted(false);
    }, [userId, initialSession.open, searchHostMounted, closeGlobalSearch]);

    useGlobalSearchHostLifecycle({
        userId,
        initialSessionOpen: initialSession.open,
        setSearchHostMounted,
    });

    const primeGlobalSearchShellMount = usePrimeGlobalSearchShellMount(setSearchHostMounted);

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
