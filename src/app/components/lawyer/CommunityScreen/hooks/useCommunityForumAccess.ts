import { useEffect, useRef, useState } from 'react';

import { useAuthSafe } from '@/app/context/authHooks';
import { userHasRole } from '@/app/context/authRoleUtils';
import { readPersistedSupabaseAuth } from '@/app/utils/authStorage';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    canUseForumNetworkFeatures,
    forumAccessDenialReason,
    type NetworkAccessDenial,
} from '@/app/services/auth/lawyerAccountStatus';
import {
    fetchAccountNetworkGate,
    peekAccountNetworkGate,
    subscribeAccountNetworkGate,
} from '@/app/services/auth/accountNetworkGate';
import { syncLawyerVerificationFromServer } from '@/app/services/auth/lawyerVerificationRemote';

export type UseCommunityForumAccessParams = {
    lawyerShellAccess?: boolean;
    fallbackUserId?: string | null;
};

export function useCommunityForumAccess({
    lawyerShellAccess = false,
    fallbackUserId = null,
}: UseCommunityForumAccessParams) {
    const { user: authUser, isLoading: authIsLoading, hasRole } = useAuthSafe();
    const persistedAuth = readPersistedSupabaseAuth();
    const persistedUser = persistedAuth.user;
    const hadAuthenticatedUserRef = useRef(false);
    if (authUser && isRealSignedIn(authUser.id)) hadAuthenticatedUserRef.current = true;

    const sessionUserId = authUser?.id ?? persistedUser?.id ?? null;
    const uid = sessionUserId;
    const sessionMetadata = (authUser?.user_metadata ??
        persistedUser?.user_metadata ??
        null) as Record<string, unknown> | null;
    const sessionAppMetadata = (authUser?.app_metadata ??
        persistedUser?.app_metadata ??
        null) as Record<string, unknown> | null;
    const [verificationEpoch, setVerificationEpoch] = useState(0);
    void verificationEpoch;
    void fallbackUserId;

    const networkOk = canUseForumNetworkFeatures(uid, sessionMetadata, sessionAppMetadata);
    const isLawyer =
        (authUser != null && hasRole('lawyer')) ||
        (persistedUser != null && userHasRole(persistedUser, 'lawyer'));

    const canAccessLawyerForum = networkOk && isLawyer;
    const forumDenial: NetworkAccessDenial | null = forumAccessDenialReason(
        uid,
        sessionMetadata,
        sessionAppMetadata,
    );

    const currentUserId = uid;
    const signedIn = Boolean(uid && isRealSignedIn(uid));
    const [accountFrozen, setAccountFrozen] = useState(false);
    const [frozenMessage, setFrozenMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!signedIn || !uid) {
            setAccountFrozen(false);
            setFrozenMessage(null);
            return;
        }
        let cancelled = false;
        void (async () => {
            const syncStatus = syncLawyerVerificationFromServer(uid)
                .then(() => {
                    if (!cancelled) setVerificationEpoch((n) => n + 1);
                })
                .catch(() => undefined);
            const syncFreeze = fetchAccountNetworkGate(uid)
                .then((gate) => {
                    if (cancelled) return;
                    setAccountFrozen(gate.frozen || gate.code === 'ACCOUNT_LOCKED' || gate.code === 'ACCOUNT_FROZEN');
                    setFrozenMessage(gate.message);
                })
                .catch(() => {
                    if (cancelled) return;
                    setAccountFrozen(false);
                    setFrozenMessage(null);
                });
            await Promise.all([syncStatus, syncFreeze]);
        })();
        return () => {
            cancelled = true;
        };
    }, [signedIn, uid]);

    useEffect(() => {
        if (!signedIn || !uid) return;
        return subscribeAccountNetworkGate(() => {
            const gate = peekAccountNetworkGate(uid);
            if (!gate) return;
            setAccountFrozen(gate.frozen || gate.code === 'ACCOUNT_LOCKED' || gate.code === 'ACCOUNT_FROZEN');
            setFrozenMessage(gate.message);
        });
    }, [signedIn, uid]);

    const showLoadingShell =
        authIsLoading &&
        !authUser &&
        !hadAuthenticatedUserRef.current &&
        !uid &&
        !(lawyerShellAccess && networkOk);

    return {
        authUser,
        authIsLoading,
        persistedUser,
        hasRole,
        canAccessLawyerForum,
        forumDenial,
        currentUserId,
        showLoadingShell,
        accountFrozen,
        frozenMessage,
        isAdmin: hasRole('admin'),
    };
}
