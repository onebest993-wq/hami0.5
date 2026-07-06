import React from 'react';
import { GlobalSearchOverlayHost } from '@/app/components/lawyer/GlobalSearchOverlay/GlobalSearchOverlayHost';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { useGlobalSearchShellLifecycle } from '@/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle';
import { useGlobalSearchMobileSuspend } from '@/app/hooks/lawyerDashboard/useGlobalSearchMobileSuspend';
import { getCachedGlobalSearchExtras } from '@/app/services/globalSearchLoad';
import { hasAnyCachedGlobalSearchFuse } from '@/app/services/globalSearchFuse';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';

export function LawyerDashboardGlobalSearchOverlayEntry({
    shell,
    data,
    overlays,
    nav,
}: Pick<LawyerDashboardOverlaysHostProps, 'shell' | 'data' | 'overlays' | 'nav'>) {
    const { userId, authUserId } = shell;
    const { files, executionFiles, globalNotes, searchNotifications, criminalCasesForCluster } = data;
    const { showGlobalSearch, globalSearchInitialQuery, globalSearchSessionKey, searchIndexVersion } = overlays;
    const { handleGlobalSearchNavigate, closeGlobalSearch } = nav;

    const forumUserId = resolveShellAuthUserId(authUserId, userId);
    const globalSearchEnabled = isRealSignedIn(forumUserId);
    const hasGlobalSearchWarmCache =
        hasAnyCachedGlobalSearchFuse() ||
        Boolean(forumUserId && getCachedGlobalSearchExtras(forumUserId));

    useGlobalSearchShellLifecycle(
        globalSearchEnabled && showGlobalSearch,
        forumUserId ?? '',
        hasGlobalSearchWarmCache,
    );
    useGlobalSearchMobileSuspend(globalSearchEnabled && showGlobalSearch);

    if (!globalSearchEnabled || !showGlobalSearch) return null;

    return (
        <div data-hami-global-search-shell="">
            <GlobalSearchOverlayHost
                key="global-search-overlay"
                open={showGlobalSearch}
                files={files}
                executionFiles={executionFiles}
                globalNotes={globalNotes}
                notifications={searchNotifications}
                criminalCases={criminalCasesForCluster}
                userId={userId ?? null}
                initialQuery={globalSearchInitialQuery}
                searchSessionKey={globalSearchSessionKey}
                indexVersion={searchIndexVersion}
                onClose={closeGlobalSearch}
                onNavigate={handleGlobalSearchNavigate}
            />
        </div>
    );
}
