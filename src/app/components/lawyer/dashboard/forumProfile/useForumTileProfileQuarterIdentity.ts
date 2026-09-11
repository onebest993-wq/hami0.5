import { useEffect, useRef, useState } from 'react';
import { useLawyerProfileHeader } from '@/app/hooks/useLawyerProfileHeader';
import {
    isSameUserIdentity,
    subscribeUserIdentityUiState,
    type UserIdentityUiState,
} from '@/app/services/profile/userIdentityUiState';
import { pickForumTileProfilePaintState } from '@/app/components/lawyer/dashboard/forumProfile/pickForumTileProfilePaintState';
import { tearDownForumFloatingState } from '@/app/components/lawyer/CommunityScreen/tearDownForumFloatingState';

let forumTileOpenSessionCounter = 0;
let lastActiveForumTileSessionId = 0;

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
    const openSessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    useEffect(() => {
        forumTileOpenSessionCounter += 1;
        openSessionIdRef.current += 1;
        const currentSessionId = openSessionIdRef.current;
        activeSessionIdRef.current = currentSessionId;
        lastActiveForumTileSessionId = currentSessionId;
        const unsubscribe = subscribeUserIdentityUiState((next) => {
            if (activeSessionIdRef.current !== currentSessionId) return;
            if (!next) return;
            if (userId && next.userId !== userId) return;
            setIdentity((prev) => (isSameUserIdentity(prev, next) ? prev : next));
        });
        return () => {
            unsubscribe();
            if (activeSessionIdRef.current === currentSessionId) {
                activeSessionIdRef.current = 0;
                tearDownForumFloatingState();
            }
        };
    }, [userId]);

    useEffect(() => {
        forumTileOpenSessionCounter += 1;
        openSessionIdRef.current += 1;
        const currentSessionId = openSessionIdRef.current;
        activeSessionIdRef.current = currentSessionId;
        lastActiveForumTileSessionId = currentSessionId;
        const next = pickForumTileProfilePaintState(
            userId,
            userMetadata,
            liveName,
            liveAvatar,
            seedDisplayName,
        );
        if (activeSessionIdRef.current !== currentSessionId) return;
        setIdentity((prev) => (isSameUserIdentity(prev, next) ? prev : next));
        return () => {
            if (activeSessionIdRef.current === currentSessionId) {
                activeSessionIdRef.current = 0;
            }
        };
    }, [userId, userMetadata, liveName, liveAvatar, seedDisplayName]);

    return identity;
}
