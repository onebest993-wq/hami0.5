import React, { useRef } from 'react';
import { HUB_TILE_BUTTON_A11Y } from '@/app/components/lawyer/dashboard/commandHub/commandHubTileClasses';
import { ForumTileProfileAvatarFace } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileAvatarFace';
import {
    FORUM_TILE_PROFILE_TAP_STYLE,
    ForumTileProfileQuarterChrome,
} from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterChrome';
import { forumTileFallbackPaintAvatarUrl } from '@/app/components/lawyer/dashboard/forumProfile/forumTileFallbackPaintAvatarUrl';
import type { ForumTileProfileQuarterFallbackProps } from '@/app/components/lawyer/dashboard/forumProfile/forumTileProfileQuarterTypes';
import { isForumTileProfilePointerScroll } from '@/app/components/lawyer/dashboard/forumProfile/forumTileProfileQuarterTypes';
import { sanitizeProfilePlainText } from '@/app/services/profile/profileUrlSanitize';
import { resolveLawyerTilePublicName } from '@/app/components/lawyer/dashboard/forumProfile/resolveLawyerTilePublicName';
import { useAccreditedLawyerMark } from '@/app/hooks/useAccreditedLawyerMark';

/** هيكل خفيف لربع الملف — بلا استيراد صورة/ملف حتى يبقى commandHub خفيفاً */
export function ForumTileProfileQuarterFallback({
    displayName = 'المحامي',
    profileInitial = 'م',
    avatarUrl = '',
    showInitial = true,
    identitySettled = false,
    disabled = false,
    userId,
    userMetadata,
    onOpenProfile,
    onPrimeProfile,
    onPrimeProfilePress,
}: ForumTileProfileQuarterFallbackProps = {}) {
    const accredited = useAccreditedLawyerMark(userId, userMetadata);
    const publicName = resolveLawyerTilePublicName(displayName).name;
    const interactive = Boolean(onOpenProfile) && !disabled;
    const paintAvatarUrl = forumTileFallbackPaintAvatarUrl(avatarUrl);
    const avatarExpected = Boolean(paintAvatarUrl);
    const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
    const scrolledAwayRef = useRef(false);
    const className = `hami-forum-tile-profile relative z-[2] min-h-[44px] min-w-[44px] p-0 touch-manipulation${
        interactive ? ` ${HUB_TILE_BUTTON_A11Y}` : ''
    }`;
    const shell = {
        className,
        'data-testid': 'home-dock-forum-profile',
        'data-identity-settled': identitySettled ? '1' : '0',
        'data-avatar-expected': avatarExpected ? '1' : '0',
        ...(identitySettled ? {} : { 'aria-busy': true as const }),
        'aria-label': `الملف المهني — ${sanitizeProfilePlainText(publicName, 80) || 'المحامي'}`,
    };
    const chrome = (
        <ForumTileProfileQuarterChrome displayName={displayName} accredited={accredited}>
            <ForumTileProfileAvatarFace
                profileInitial={profileInitial}
                showInitial={showInitial !== false}
            />
        </ForumTileProfileQuarterChrome>
    );

    if (!interactive) {
        return <div {...shell}>{chrome}</div>;
    }

    return (
        <button
            type="button"
            {...shell}
            aria-controls="lawyer-dashboard-profile-surface"
            disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onPointerEnter={onPrimeProfile}
            onPointerDown={(event) => {
                if (event.button !== 0) return;
                scrolledAwayRef.current = false;
                pressOriginRef.current = { x: event.clientX, y: event.clientY };
                (onPrimeProfilePress ?? onPrimeProfile)?.();
            }}
            onPointerMove={(event) => {
                if (scrolledAwayRef.current) return;
                if (isForumTileProfilePointerScroll(pressOriginRef.current, event)) {
                    scrolledAwayRef.current = true;
                }
            }}
            onPointerCancel={() => {
                pressOriginRef.current = null;
                scrolledAwayRef.current = false;
            }}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                const origin = pressOriginRef.current;
                pressOriginRef.current = null;
                if (scrolledAwayRef.current || isForumTileProfilePointerScroll(origin, event)) {
                    scrolledAwayRef.current = false;
                    return;
                }
                (onPrimeProfilePress ?? onPrimeProfile)?.();
                onOpenProfile?.();
            }}
            style={FORUM_TILE_PROFILE_TAP_STYLE}
        >
            {chrome}
        </button>
    );
}
