import { useRef } from 'react';

import { useAuthSafe, userHasRole } from '@/app/context/AuthContext';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';

export type UseCommunityForumAccessParams = {
    lawyerShellAccess?: boolean;
    fallbackUserId?: string | null;
};

export function useCommunityForumAccess({
    lawyerShellAccess = false,
    fallbackUserId = null,
}: UseCommunityForumAccessParams) {
    const forumDevOpen = import.meta.env.DEV && import.meta.env.VITE_COMMUNITY_DEV_OPEN === 'true';
    const { user: authUser, isLoading: authIsLoading, hasRole } = useAuthSafe();
    const persistedAuth = readPersistedSupabaseAuth();
    const persistedUser = persistedAuth.user;
    const hadAuthenticatedUserRef = useRef(false);
    if (authUser) hadAuthenticatedUserRef.current = true;

    const canAccessLawyerForum =
        forumDevOpen ||
        lawyerShellAccess ||
        (authUser != null && hasRole('lawyer')) ||
        (persistedUser != null && userHasRole(persistedUser, 'lawyer'));

    const currentUserId = authUser?.id ?? persistedUser?.id ?? fallbackUserId ?? null;

    const showLoadingShell =
        authIsLoading &&
        !authUser &&
        !persistedUser &&
        !forumDevOpen &&
        !hadAuthenticatedUserRef.current &&
        !lawyerShellAccess;

    return {
        authUser,
        authIsLoading,
        persistedUser,
        hasRole,
        canAccessLawyerForum,
        currentUserId,
        showLoadingShell,
        isAdmin: hasRole('admin'),
    };
}
