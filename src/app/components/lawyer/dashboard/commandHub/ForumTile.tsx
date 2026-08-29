import React, { memo, useMemo } from 'react';
import { useScrollSafePress } from '@/app/hooks/useScrollSafePress';
import type { HomeBlockStyleOverride } from '@/app/services/settings/homeLayout';
import { resolveForumShellAriaLabel } from '@/app/services/forum/forumShellNavigation';
import { resolveForumTileProfileChrome } from '@/app/services/profile/resolveForumTileProfileChrome';
import { HUB_TILE_BUTTON_A11Y } from './commandHubTileClasses';
import { ForumTileMainFace } from './ForumTileMainFace';
import { forumTileOpenButtonProps, forumTilePrefetchHandlers } from './forumTileOpenButtonProps';
import { useForumTileChrome } from './useForumTileChrome';
import { ForumTileProfileQuarterSlot } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterSlot';

type ForumTileProps = {
    forumUnreadCount: number;
    onOpen: () => void;
    onPrefetch?: () => void;
    reduceMotion: boolean;
    blockOverride?: HomeBlockStyleOverride;
    interactionDisabled?: boolean;
    layoutSpan?: 1 | 2;
    userId?: string;
    userMetadata?: Record<string, unknown>;
    onOpenProfile?: () => void;
    onPrimeProfile?: () => void;
    onPrimeProfilePress?: () => void;
};

/**
 * بلاطة المنتدى على المسار البارد — كروم فقط.
 * ربع الملف (صورة/فتح فوري) مقطع async منفصل.
 */
export const ForumTile = memo(function ForumTile({
    forumUnreadCount,
    onOpen,
    onPrefetch,
    reduceMotion,
    blockOverride,
    interactionDisabled = false,
    layoutSpan = 1,
    userId,
    userMetadata,
    onOpenProfile,
    onPrimeProfile,
    onPrimeProfilePress,
}: ForumTileProps) {
    const chrome = useForumTileChrome({
        forumUnreadCount,
        reduceMotion,
        blockOverride,
        interactionDisabled,
    });
    const prefetchHandlers = forumTilePrefetchHandlers(interactionDisabled, onPrefetch);
    const press = useScrollSafePress({
        disabled: interactionDisabled,
        onPress: onOpen,
        onPointerDown: prefetchHandlers.onPointerDown,
    });
    const openButton = forumTileOpenButtonProps(prefetchHandlers, press, interactionDisabled);
    const showProfileQuarter = layoutSpan === 2 && Boolean(onOpenProfile);
    const profileChrome = useMemo(
        () => (showProfileQuarter ? resolveForumTileProfileChrome(userId, userMetadata) : null),
        [showProfileQuarter, userId, userMetadata],
    );

    const face = (
        <ForumTileMainFace
            forumLabel={chrome.forumLabel}
            tileVisuals={chrome.tileVisuals}
            unreadBadgeVisible={chrome.unreadBadgeVisible}
            forumUnreadCount={forumUnreadCount}
            interactionDisabled={interactionDisabled}
            blockOverride={blockOverride}
            cardThemePrimary={chrome.cardThemePrimary}
        />
    );
    const ariaLabel = resolveForumShellAriaLabel(forumUnreadCount, {
        layoutEditMode: interactionDisabled,
    });

    if (!showProfileQuarter) {
        return (
            <button
                {...openButton}
                data-hami-block="forum"
                data-hami-block-border={chrome.containerBorderOn ? '1' : '0'}
                data-testid="home-dock-forum"
                aria-label={ariaLabel}
                data-hami-layout-span={layoutSpan}
                className={chrome.shellClass}
                style={chrome.style}
            >
                {face}
            </button>
        );
    }

    return (
        <div
            data-hami-block="forum"
            data-hami-block-border="0"
            data-hami-layout-span={layoutSpan}
            data-testid="home-dock-forum-shell"
            className={chrome.profileShellClass}
            dir="rtl"
            style={chrome.style}
        >
            <ForumTileProfileQuarterSlot
                userId={userId}
                userMetadata={userMetadata}
                disabled={interactionDisabled}
                onOpenProfile={onOpenProfile!}
                onPrimeProfile={onPrimeProfile}
                onPrimeProfilePress={onPrimeProfilePress}
                chrome={profileChrome}
            />
            <button
                {...openButton}
                data-testid="home-dock-forum"
                data-hami-layout-span="1"
                className={`hami-forum-tile-main relative z-[1] min-h-[44px] ${HUB_TILE_BUTTON_A11Y}`}
                aria-label={ariaLabel}
            >
                {face}
            </button>
        </div>
    );
});
