import React, { Suspense } from 'react';
import { AnimatePresence } from 'motion/react';
import { FORUM_LAYER } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { CommunityErrorBoundary } from '@/app/components/lawyer/CommunityScreen/CommunityErrorBoundary';
import {
    LazyGlobalSearchOverlay,
    LazyCriminalDashboard,
    LazyCommunityScreen,
} from '@/app/utils/lazyComponents';
import DossierOpeningFallbackComponent from '@/app/components/lawyer/LawyerDashboardParts/components/DossierOpeningFallback';
import {
    GLOBAL_SEARCH_OVERLAY_FALLBACK,
    LAWYER_LAZY_FALLBACK,
} from '@/app/components/lawyer/LawyerDashboardParts/constants';
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
        searchIndexVersion,
        criminalDashboardCaseId,
        openCriminalCase,
        closeCriminalCase,
        showCommunity,
        communityDeepLink,
        handleCommunityBack,
    } = overlays;
    const { handleGlobalSearchNavigate, closeGlobalSearch } = nav;

    return (
        <>
            {criminalDashboardCaseId ? (
                <Suspense fallback={DOSSIER_OPENING_FALLBACK}>
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
                </Suspense>
            ) : null}

            <AnimatePresence>
                {showGlobalSearch && (
                    <Suspense key="global-search" fallback={GLOBAL_SEARCH_OVERLAY_FALLBACK}>
                        <LazyGlobalSearchOverlay
                            files={files}
                            executionFiles={executionFiles}
                            globalNotes={globalNotes}
                            notifications={searchNotifications}
                            criminalCases={criminalCasesForCluster}
                            userId={userId ?? null}
                            initialQuery={globalSearchInitialQuery}
                            indexVersion={searchIndexVersion}
                            onClose={closeGlobalSearch}
                            onNavigate={handleGlobalSearchNavigate}
                        />
                    </Suspense>
                )}
            </AnimatePresence>

            {showCommunity ? (
                <div className={FORUM_LAYER}>
                    <CommunityErrorBoundary onReset={handleCommunityBack}>
                        <Suspense fallback={LAWYER_LAZY_FALLBACK}>
                            <LazyCommunityScreen
                                onBack={handleCommunityBack}
                                initialPostId={communityDeepLink?.postId ?? null}
                                initialOpenComments={communityDeepLink?.openComments ?? false}
                                lawyerShellAccess={lawyerShellAccess}
                                fallbackUserId={userId ?? authUserId ?? null}
                            />
                        </Suspense>
                    </CommunityErrorBoundary>
                </div>
            ) : null}
        </>
    );
}
