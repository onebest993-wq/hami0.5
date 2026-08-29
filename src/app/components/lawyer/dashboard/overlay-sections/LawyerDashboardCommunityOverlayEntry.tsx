import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { inertProps } from '@/app/utils/inertProps';
import { FORUM_LAYER } from '@/app/components/lawyer/CommunityScreen/forumPlumTheme';
import { CommunityErrorBoundary } from '@/app/components/lawyer/CommunityScreen/CommunityErrorBoundary';
import { CommunityScreenHost } from '@/app/components/lawyer/CommunityScreen/CommunityScreenHost';
import { getForumOverlayPortalRoot } from '@/app/components/lawyer/CommunityScreen/forumOverlayPortal';
import { isForumShellPaintedOpen } from '@/app/runtime/forumInstantPaint';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import type { LawyerDashboardOverlaysBundleProps } from '../lawyerDashboardOverlaysBundles';

/**
 * منتدى الزملاء — Entry sync في MainView (مثل الإعدادات).
 * Host يُركَّب عند الفتح أو keepAlive؛ المحتوى عبر isOpen.
 * الطبقة تُنقل خارج لوحة المحامي: content-visibility:hidden على اللوحة كان يخفي المنتدى معها (شاشة سوداء).
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
    const [portalRoot] = useState(() =>
        typeof document === 'undefined' ? null : getForumOverlayPortalRoot(),
    );

    if (!shouldMount || !forumUserId) return null;

    /* ستارة instant-paint تضع html[data-hami-forum-open] قبل flushSync.
     * إعادة hidden على Host تُبقي الشريط في DOM وPlaywright يراه مخفياً. */
    const layerOpen = showCommunity || isForumShellPaintedOpen();

    const overlay = (
        <div
            className={`${FORUM_LAYER} text-[#F3F0EA] hami-forum-overlay-layer${layerOpen ? ' hami-forum-overlay-layer--visible pointer-events-auto' : ' pointer-events-none'}`}
            aria-hidden={!layerOpen}
            hidden={!layerOpen}
            data-forum-layer-open={layerOpen ? '1' : '0'}
            data-testid="forum-overlay-host"
            {...inertProps(!layerOpen)}
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

    if (!portalRoot) return overlay;
    return createPortal(overlay, portalRoot);
}
