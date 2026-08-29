import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ProfilePageCustomization } from '@/app/services/profile/profilePageCustomization';
import {
    canViewProfilePage,
    nextProfilePageAccess,
    resolveProfilePageAccess,
} from '@/app/services/profile/profilePageAccess';
import type { ProfilePageAccess } from '@/app/services/profile/profilePageTypes';

type UseProfilePageAccessArgs = {
    isOwnProfile: boolean;
    profileUserId: string;
    viewerId: string;
    customization: ProfilePageCustomization;
    forumFollowIsFollowing?: boolean;
    saveCustomization: (next: ProfilePageCustomization, options?: { silent?: boolean }) => Promise<boolean>;
};

export function useProfilePageAccess({
    isOwnProfile,
    profileUserId,
    viewerId,
    customization,
    forumFollowIsFollowing,
    saveCustomization,
}: UseProfilePageAccessArgs) {
    const pageAccess = resolveProfilePageAccess(customization.privacy);
    const needsFollowCheck = !isOwnProfile && pageAccess === 'followers';
    const [isFollowing, setIsFollowing] = useState<boolean | null>(() =>
        forumFollowIsFollowing !== undefined ? forumFollowIsFollowing : null,
    );
    const [accessBusy, setAccessBusy] = useState(false);
    const followGenRef = useRef(0);

    useEffect(() => {
        if (!needsFollowCheck) {
            setIsFollowing(null);
            return;
        }
        if (forumFollowIsFollowing !== undefined) {
            setIsFollowing(forumFollowIsFollowing);
            return;
        }
        const generation = ++followGenRef.current;
        let cancelled = false;
        void import('@/app/services/cloud/lawyerCommunityCloud')
            .then(({ FollowDB }) => FollowDB.isFollowing(viewerId, profileUserId))
            .then((following) => {
                if (cancelled || generation !== followGenRef.current) return;
                setIsFollowing(following);
            })
            .catch(() => {
                if (cancelled || generation !== followGenRef.current) return;
                setIsFollowing(false);
            });
        return () => {
            cancelled = true;
        };
    }, [needsFollowCheck, forumFollowIsFollowing, viewerId, profileUserId]);

    const canView = useMemo(
        () =>
            canViewProfilePage({
                pageAccess,
                isOwner: isOwnProfile,
                isFollowing: isFollowing ?? false,
            }),
        [pageAccess, isOwnProfile, isFollowing],
    );

    const followCheckPending = needsFollowCheck && isFollowing === null;

    const cyclePageAccess = useCallback(() => {
        if (!isOwnProfile || accessBusy) return;
        const next = nextProfilePageAccess(pageAccess);
        setAccessBusy(true);
        void saveCustomization(
            {
                ...customization,
                privacy: { ...customization.privacy, pageAccess: next },
            },
            { silent: true },
        );
        /* الحفظ السحابي قد يستغرق PROFILE_SAVE_TIMEOUT_MS — لا نُقفل الزر عليه */
        const release = () => setAccessBusy(false);
        if (typeof requestAnimationFrame !== 'function') {
            release();
            return;
        }
        requestAnimationFrame(() => {
            requestAnimationFrame(release);
        });
    }, [isOwnProfile, accessBusy, pageAccess, saveCustomization, customization]);

    return {
        pageAccess: pageAccess as ProfilePageAccess,
        canView,
        followCheckPending,
        accessBusy,
        cyclePageAccess,
    };
}
