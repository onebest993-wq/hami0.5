import React, { Suspense, useLayoutEffect, useState } from 'react';
import { GlobalSearchShellPortal } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchShellPortal';
import { GlobalSearchOverlayLayerFrame } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayLayerFrame';
import { GlobalSearchInstantSheetChrome } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchInstantSheetChrome';
import { hasLocalAppSession, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { useGlobalSearchShellLifecycle } from '@/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle';
import { useGlobalSearchMobileSuspend } from '@/app/hooks/lawyerDashboard/useGlobalSearchMobileSuspend';
import { concealGlobalSearchWarmShell } from '@/app/runtime/globalSearchInstantPaint';
import { snapGlobalSearchShellClose } from '@/app/services/search/globalSearchShellSnap';
import { deferShellConcealAfterHandoff, isShellHandoffPending } from '@/app/runtime/sectionShellHandoff';
import { loadGlobalSearchOverlayHost } from '@/app/runtime/globalSearchLoader';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

const LazyGlobalSearchOverlayHost = lazyWithRetry(() =>
    loadGlobalSearchOverlayHost().then((m) => ({
        default: m.GlobalSearchOverlayHost as unknown as LazyComponent,
    })),
);

export function LawyerDashboardGlobalSearchOverlayEntry({
    shell,
    data,
    overlays,
    nav,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'data' | 'overlays' | 'nav'>) {
    const { userId, authUserId } = shell;
    const { files, executionFiles, globalNotes, searchNotifications, criminalCasesForCluster, lawsuitLifecycleIndex } =
        data;
    const {
        showGlobalSearch,
        searchHostMounted,
        globalSearchInitialQuery,
        globalSearchSessionKey,
        searchIndexVersion,
    } = overlays;
    const { handleGlobalSearchNavigate, closeGlobalSearch } = nav;

    const forumUserId = resolveShellAuthUserId(authUserId, userId);
    const globalSearchEnabled = hasLocalAppSession(forumUserId);
    const shouldMount = globalSearchEnabled && (showGlobalSearch || searchHostMounted);
    const [hasGlobalSearchWarmCache, setHasGlobalSearchWarmCache] = useState(false);

    useLayoutEffect(() => {
        if (!(globalSearchEnabled && showGlobalSearch)) {
            setHasGlobalSearchWarmCache(false);
            return;
        }
        let cancelled = false;
        void import('@/app/services/search/globalSearchLocalWarmProbe').then((m) => {
            if (cancelled) return;
            setHasGlobalSearchWarmCache(m.hasGlobalSearchLocalWarmCache(forumUserId));
        });
        return () => {
            cancelled = true;
        };
    }, [forumUserId, globalSearchEnabled, showGlobalSearch]);

    useGlobalSearchShellLifecycle(
        globalSearchEnabled && showGlobalSearch,
        forumUserId ?? '',
        hasGlobalSearchWarmCache,
    );
    useGlobalSearchMobileSuspend(globalSearchEnabled && showGlobalSearch);

    useLayoutEffect(() => {
        if (!shouldMount || showGlobalSearch) return;
        return deferShellConcealAfterHandoff(() => {
            if (isShellHandoffPending('global-search') || showGlobalSearch) return;
            concealGlobalSearchWarmShell();
            snapGlobalSearchShellClose();
        });
    }, [shouldMount, showGlobalSearch]);

    if (!shouldMount) return null;

    return (
        <GlobalSearchShellPortal>
            <Suspense
                fallback={
                    showGlobalSearch ? (
                        <GlobalSearchOverlayLayerFrame
                            open
                            onClose={closeGlobalSearch}
                            paint
                            coverTestId="global-search-instant-cover"
                            armBackdropClose={false}
                        >
                            <GlobalSearchInstantSheetChrome onClose={closeGlobalSearch} />
                        </GlobalSearchOverlayLayerFrame>
                    ) : null
                }
            >
                <LazyGlobalSearchOverlayHost
                    key="global-search-overlay"
                    open={showGlobalSearch}
                    keepAlive={searchHostMounted}
                    files={files}
                    executionFiles={executionFiles}
                    lawsuitLifecycleIndex={lawsuitLifecycleIndex}
                    globalNotes={globalNotes}
                    notifications={searchNotifications}
                    criminalCases={criminalCasesForCluster}
                    userId={forumUserId}
                    initialQuery={globalSearchInitialQuery}
                    searchSessionKey={globalSearchSessionKey}
                    indexVersion={searchIndexVersion}
                    onClose={closeGlobalSearch}
                    onNavigate={handleGlobalSearchNavigate}
                />
            </Suspense>
        </GlobalSearchShellPortal>
    );
}
