import React, { Suspense } from 'react';
import { FORUM_LAYER } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { CommunityErrorBoundary } from '@/app/components/lawyer/CommunityScreen/CommunityErrorBoundary';
import {
    LazyGlobalSearchOverlay,
    LazyCriminalDashboard,
    LazyCommunityScreen,
} from '@/app/utils/lazyComponents';
import { CriminalDashboardPortal } from '@/app/components/lawyer/criminal-system/CriminalDashboardPortal';
import DossierOpeningFallbackComponent from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';
import { CommunityScreenLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import { GlobalSearchOverlayLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import { isRealSignedIn, resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { useGlobalSearchShellLifecycle } from '@/app/hooks/lawyerDashboard/useGlobalSearchShellLifecycle';
import { useGlobalSearchMobileSuspend } from '@/app/hooks/lawyerDashboard/useGlobalSearchMobileSuspend';
import { getCachedGlobalSearchExtras } from '@/app/services/globalSearchLoad';
import { hasAnyCachedGlobalSearchFuse } from '@/app/services/globalSearchFuse';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';

const DOSSIER_OPENING_FALLBACK = <DossierOpeningFallbackComponent />;

export function LawyerDashboardDiscoveryOverlays({
    shell,
    data,
    overlays,
    criminalBridge,
    nav,
}: Pick<
    LawyerDashboardOverlaysHostProps,
    'shell' | 'data' | 'overlays' | 'criminalBridge' | 'nav'
>) {
    const { userId, authUserId, lawyerShellAccess } = shell;
    const { files, executionFiles, globalNotes, searchNotifications, criminalCasesForCluster } = data;
    const {
        showGlobalSearch,
        globalSearchInitialQuery,
        globalSearchSessionKey,
        searchIndexVersion,
        criminalDashboardCaseId,
        openCriminalCase,
        closeCriminalCase,
        showCommunity,
        communitySessionKey,
        resetCommunityScreen,
        communityDeepLink,
        closeCommunity,
        openProfileTab,
    } = overlays;
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

    return (
        <>
            {criminalDashboardCaseId ? (
                <CriminalDashboardPortal fallback={DOSSIER_OPENING_FALLBACK}>
                    <LazyCriminalDashboard
                        key={criminalDashboardCaseId}
                        id={criminalDashboardCaseId}
                        onClose={closeCriminalCase}
                        onOpenCase={(caseId: string) => {
                            openCriminalCase(caseId, { keepReturnTarget: true });
                        }}
                        onRequestNewCaseFromSeverance={() => {
                            criminalBridge.resumePendingSeveranceForm();
                        }}
                    />
                </CriminalDashboardPortal>
            ) : null}

            {globalSearchEnabled ? (
                <div data-hami-global-search-shell="" hidden={!showGlobalSearch}>
                    {showGlobalSearch ? (
                        <Suspense fallback={<GlobalSearchOverlayLoadingFallback onClose={closeGlobalSearch} />}>
                            <LazyGlobalSearchOverlay
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
                        </Suspense>
                    ) : null}
                </div>
            ) : null}

            {showCommunity ? (
                <div className={FORUM_LAYER} aria-hidden={false}>
                    <CommunityErrorBoundary onReset={resetCommunityScreen}>
                        {forumUserId ? (
                            <Suspense
                                fallback={<CommunityScreenLoadingFallback onBack={closeCommunity} />}
                            >
                                <LazyCommunityScreen
                                    key={`forum-community-${communitySessionKey}`}
                                    onBack={closeCommunity}
                                    initialPostId={communityDeepLink?.postId ?? null}
                                    initialOpenComments={communityDeepLink?.openComments ?? false}
                                    lawyerShellAccess={lawyerShellAccess}
                                    fallbackUserId={forumUserId}
                                    onOpenOwnProfile={() => {
                                        closeCommunity();
                                        openProfileTab();
                                    }}
                                />
                            </Suspense>
                        ) : (
                            <CommunityScreenLoadingFallback onBack={closeCommunity} />
                        )}
                    </CommunityErrorBoundary>
                </div>
            ) : null}
        </>
    );
}
