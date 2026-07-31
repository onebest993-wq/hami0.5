import React from 'react';
import { FORUM_LAYER } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { CommunityErrorBoundary } from '@/app/components/lawyer/CommunityScreen/CommunityErrorBoundary';
import { CommunityScreenHost } from '@/app/components/lawyer/CommunityScreen/CommunityScreenHost';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

/**
 * منتدى الزملاء — Entry sync في MainView (مثل الإعدادات).
 * Host يُركَّب عند الفتح أو keepAlive؛ المحتوى عبر isOpen.
 */
export function LawyerDashboardCommunityOverlayEntry({
    shell,
    overlays,
}: Pick<LawyerDashboardOverlaysBundleProps, 'shell' | 'overlays'>) {
    const { userId, authUserId, lawyerShellAccess } = shell;
    const {
        showCommunity,
        communityHostMounted,
        communitySessionKey,
        resetCommunityScreen,
        communityDeepLink,
        closeCommunity,
        openProfileTab,
    } = overlays;

    const forumUserId = resolveShellAuthUserId(authUserId, userId);
    const shouldMount = Boolean(forumUserId) && (showCommunity || communityHostMounted);

    if (!shouldMount || !forumUserId) return null;

    return (
        <div
            className={`${FORUM_LAYER}${showCommunity ? '' : ' pointer-events-none'}`}
            aria-hidden={!showCommunity}
            hidden={!showCommunity}
            data-forum-layer-open={showCommunity ? '1' : '0'}
            data-testid="forum-overlay-host"
        >
            <CommunityErrorBoundary onReset={resetCommunityScreen}>
                <CommunityScreenHost
                    key={`forum-community-${communitySessionKey}`}
                    isOpen={showCommunity}
                    keepAlive={communityHostMounted}
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
            </CommunityErrorBoundary>
        </div>
    );
}
