import React, { memo, useMemo, useRef } from 'react';
import { ProfileAvatarImage } from '@/app/components/lawyer/RoyalLawyerProfile/components/ProfileAvatarImage';
import { PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE } from '@/app/services/profile/resolveProfileAvatarDisplaySrc';
import {
    beginProfileBackLock,
} from '@/app/runtime/profileInstantPaint';
import { markProfilePerfPhase } from '@/app/services/profile/profilePerfMetrics';
import { HUB_TILE_BUTTON_A11Y } from '@/app/components/lawyer/dashboard/commandHub/commandHubTileClasses';
import { ForumTileProfileAvatarFace } from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileAvatarFace';
import {
    FORUM_TILE_PROFILE_TAP_STYLE,
    ForumTileProfileQuarterChrome,
} from '@/app/components/lawyer/dashboard/forumProfile/ForumTileProfileQuarterChrome';
import { useForumTileProfileQuarterIdentity } from '@/app/components/lawyer/dashboard/forumProfile/useForumTileProfileQuarterIdentity';
import type { ForumTileProfileQuarterProps } from '@/app/components/lawyer/dashboard/forumProfile/forumTileProfileQuarterTypes';
import { isForumTileProfilePointerScroll } from '@/app/components/lawyer/dashboard/forumProfile/forumTileProfileQuarterTypes';
import { resolveLawyerTilePublicName } from '@/app/components/lawyer/dashboard/forumProfile/resolveLawyerTilePublicName';
import { useAccreditedLawyerMark } from '@/app/hooks/useAccreditedLawyerMark';

/**
 * ربع الملف — يرسم من UserIdentityUiState الذرّي فقط.
 * لا مسارات اسم/صورة منفصلة أمام المستخدم.
 */
export const ForumTileProfileQuarter = memo(function ForumTileProfileQuarter({
    userId,
    userMetadata,
    disabled,
    onOpenProfile,
    onPrimeProfile,
    onPrimeProfilePress,
    seedDisplayName,
}: ForumTileProfileQuarterProps) {
    const identity = useForumTileProfileQuarterIdentity(userId, userMetadata, seedDisplayName);
    const accredited = useAccreditedLawyerMark(userId, userMetadata);
    const openedFromPointerRef = useRef(false);
    const pressOriginRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
    const scrolledAwayRef = useRef(false);

    const displayName = identity.displayName;
    const publicName = resolveLawyerTilePublicName(displayName).name;
    const expectedSrc = identity.avatarUrl;
    const profileInitial = identity.profileInitial;
    const identityPending = Boolean(userId) && !identity.isLoaded;
    const avatarExpected = Boolean(expectedSrc);

    const snapOpenInstant = () => {
        beginProfileBackLock();
        /* snap بعد flushSync لصفحة الفتح في commitProfileOpen — لا هنا */
    };

    const fireOpen = () => {
        if (disabled) return;
        onOpenProfile();
    };

    const continueOpen = () => {
        (onPrimeProfilePress ?? onPrimeProfile)?.();
        fireOpen();
    };

    const openFromGesture = () => {
        snapOpenInstant();
        markProfilePerfPhase('pointer-down');
        continueOpen();
    };

    const letterFace = useMemo(
        () => <ForumTileProfileAvatarFace profileInitial={profileInitial} showInitial />,
        [profileInitial],
    );

    return (
        <button
            type="button"
            data-testid="home-dock-forum-profile"
            data-identity-settled={identityPending ? '0' : '1'}
            data-avatar-expected={avatarExpected ? '1' : '0'}
            className={`hami-forum-tile-profile relative z-[2] min-h-[44px] min-w-[44px] p-0 touch-manipulation ${HUB_TILE_BUTTON_A11Y}`}
            aria-busy={identityPending || undefined}
            aria-label={
                identityPending
                    ? 'الملف المهني — جاري التحميل'
                    : `الملف المهني — ${publicName || 'المحامي'}`
            }
            aria-controls="lawyer-dashboard-profile-surface"
            title={publicName}
            disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onPointerEnter={disabled ? undefined : onPrimeProfile}
            onPointerDown={(event) => {
                if (event.button !== 0 || disabled) return;
                openedFromPointerRef.current = true;
                scrolledAwayRef.current = false;
                pressOriginRef.current = {
                    x: event.clientX,
                    y: event.clientY,
                    pointerId: event.pointerId,
                };
                (onPrimeProfilePress ?? onPrimeProfile)?.();
            }}
            onPointerMove={(event) => {
                const origin = pressOriginRef.current;
                if (!origin || scrolledAwayRef.current) return;
                if (
                    origin.pointerId != null &&
                    event.pointerId != null &&
                    event.pointerId !== origin.pointerId
                ) {
                    return;
                }
                if (isForumTileProfilePointerScroll(origin, event)) {
                    scrolledAwayRef.current = true;
                }
            }}
            onPointerUp={(event) => {
                if (event.button !== 0 || disabled) return;
                const origin = pressOriginRef.current;
                pressOriginRef.current = null;
                if (!origin) return;
                if (
                    origin.pointerId != null &&
                    event.pointerId != null &&
                    event.pointerId !== origin.pointerId
                ) {
                    return;
                }
                if (scrolledAwayRef.current || isForumTileProfilePointerScroll(origin, event)) {
                    scrolledAwayRef.current = false;
                    return;
                }
                openFromGesture();
            }}
            onPointerCancel={() => {
                pressOriginRef.current = null;
                scrolledAwayRef.current = false;
                openedFromPointerRef.current = false;
            }}
            onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (openedFromPointerRef.current) {
                    openedFromPointerRef.current = false;
                    return;
                }
                openFromGesture();
            }}
            style={FORUM_TILE_PROFILE_TAP_STYLE}
        >
            <ForumTileProfileQuarterChrome displayName={displayName} accredited={accredited}>
                <ForumTileProfileAvatarFace
                    profileInitial={profileInitial}
                    showInitial
                    image={
                        expectedSrc ? (
                            <ProfileAvatarImage
                                src={expectedSrc}
                                fit="cover"
                                fallback={letterFace}
                                displayMaxEdge={PROFILE_AVATAR_DISPLAY_MAX_EDGE_TILE}
                                priority
                                reveal="fade"
                            />
                        ) : null
                    }
                />
            </ForumTileProfileQuarterChrome>
        </button>
    );
});
