import React from 'react';
import { FORUM_LAYER } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { CommunityErrorBoundary } from '@/app/components/lawyer/CommunityScreen/CommunityErrorBoundary';
import { CommunityScreenHost } from '@/app/components/lawyer/CommunityScreen/CommunityScreenHost';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';

export function LawyerDashboardCommunityOverlayEntry({
    shell,
    overlays,
}: Pick<LawyerDashboardOverlaysHostProps, 'shell' | 'overlays'>) {
    const { userId, authUserId, lawyerShellAccess } = shell;
    const {
        showCommunity,
        communitySessionKey,
        resetCommunityScreen,
        communityDeepLink,
        closeCommunity,
        openProfileTab,
    } = overlays;

    const forumUserId = resolveShellAuthUserId(authUserId, userId);

    if (!showCommunity || !forumUserId) return null;

    return (
        <div className={FORUM_LAYER} aria-hidden={false}>
            <CommunityErrorBoundary onReset={resetCommunityScreen}>
                <CommunityScreenHost
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
            </CommunityErrorBoundary>
        </div>
    );
}
