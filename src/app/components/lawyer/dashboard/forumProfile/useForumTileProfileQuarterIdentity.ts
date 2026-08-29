import { useEffect, useState } from 'react';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';
import {
    isSameUserIdentity,
    subscribeUserIdentityUiState,
    type UserIdentityUiState,
} from '@/app/services/profile/userIdentityUiState';
import { pickForumTileProfilePaintState } from '@/app/components/lawyer/dashboard/forumProfile/pickForumTileProfilePaintState';

export function useForumTileProfileQuarterIdentity(
    userId: string | undefined,
    userMetadata: Record<string, unknown> | undefined,
    seedDisplayName?: string,
): UserIdentityUiState {
    const { displayName: liveName, avatarUrl: liveAvatar } = useLawyerProfileHeader(
        userId,
        userMetadata,
    );
    const [identity, setIdentity] = useState(() =>
        pickForumTileProfilePaintState(userId, userMetadata, liveName, liveAvatar, seedDisplayName),
    );

    useEffect(() => {
        return subscribeUserIdentityUiState((next) => {
            if (!next) return;
            if (userId && next.userId !== userId) return;
            setIdentity((prev) => (isSameUserIdentity(prev, next) ? prev : next));
        });
    }, [userId]);

    useEffect(() => {
        const next = pickForumTileProfilePaintState(
            userId,
            userMetadata,
            liveName,
            liveAvatar,
            seedDisplayName,
        );
        setIdentity((prev) => (isSameUserIdentity(prev, next) ? prev : next));
    }, [userId, userMetadata, liveName, liveAvatar, seedDisplayName]);

    return identity;
}
