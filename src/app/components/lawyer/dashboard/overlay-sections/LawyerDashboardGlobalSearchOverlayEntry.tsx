import React, { useLayoutEffect, useState } from 'react';
import { GlobalSearchOverlayHost } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { useGlobalSearchShellLifecycle } from '@/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle';
import { useGlobalSearchMobileSuspend } from '@/app/hooks/lawyerDashboard/useGlobalSearchMobileSuspend';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

export function LawyerDashboardGlobalSearchOverlayEntry({
    shell,
    data,
    overlays,
    nav,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'data' | 'overlays' | 'nav'>) {
    const { userId, authUserId } = shell;
    const { files, executionFiles, globalNotes, searchNotifications, criminalCasesForCluster } = data;
    const {
        showGlobalSearch,
        searchHostMounted,
        globalSearchInitialQuery,
        globalSearchSessionKey,
        searchIndexVersion,
    } = overlays;
    const { handleGlobalSearchNavigate, closeGlobalSearch } = nav;

    const forumUserId = resolveShellAuthUserId(authUserId, userId);
    const globalSearchEnabled = isRealSignedIn(forumUserId);
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

    if (!shouldMount) return null;

    return (
        <div data-hami-global-search-shell="">
            <GlobalSearchOverlayHost
                key="global-search-overlay"
                open={showGlobalSearch}
                keepAlive={searchHostMounted}
                files={files}
                executionFiles={executionFiles}
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
        </div>
    );
}
