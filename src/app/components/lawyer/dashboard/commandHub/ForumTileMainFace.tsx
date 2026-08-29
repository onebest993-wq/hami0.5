import React from 'react';
import { HomeBlockPatternOverlay } from '@/app/components/lawyer/dashboard/HomeBlockPatternOverlay';
import { HubTileFace } from '@/app/components/lawyer/dashboard/commandHub/commandHubTileChrome';
import { formatForumUnreadBadge } from '@/app/services/forum/forumShellNavigation';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import type { resolveHubRouteTileVisuals } from '@/app/services/settings/resolveHubRouteTileVisuals';

type HubRouteVisuals = ReturnType<typeof resolveHubRouteTileVisuals>;

type ForumTileMainFaceProps = {
    forumLabel: string;
    tileVisuals: HubRouteVisuals;
    unreadBadgeVisible: boolean;
    forumUnreadCount: number;
    interactionDisabled: boolean;
    blockOverride?: HomeBlockStyleOverride;
    cardThemePrimary: string;
};

export function ForumTileMainFace({
    forumLabel,
    tileVisuals,
    unreadBadgeVisible,
    forumUnreadCount,
    interactionDisabled,
    blockOverride,
    cardThemePrimary,
}: ForumTileMainFaceProps) {
    return (
        <>
            <HomeBlockPatternOverlay
                blockId="forum"
                override={blockOverride}
                themePrimary={cardThemePrimary}
            />
            {unreadBadgeVisible ? (
                <span className="hami-hub-unread-pip" aria-hidden>
                    {formatForumUnreadBadge(forumUnreadCount)}
                </span>
            ) : null}
            <HubTileFace label={forumLabel} visuals={tileVisuals} hideInLayoutEdit={interactionDisabled} />
        </>
    );
}
