import { createElement, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { LawyerSignInGate } from '@/app/bootstrap/LawyerSignInGate';
import { resolveDevMockLawyerUser } from '@/app/services/auth/devMockLawyerAuth';
import { isShellAuthBypassed } from '@/app/services/auth/shellAuth';

export type UseLawyerDashboardAuthParams = {
    authUser: User | null | undefined;
};

export function useLawyerDashboardAuth({
    authUser,
}: UseLawyerDashboardAuthParams) {
    const [user, setUser] = useState<User | null>(() => resolveDevMockLawyerUser(authUser));
    const authLoading = false;

    useEffect(() => {
        setUser(resolveDevMockLawyerUser(authUser));
    }, [authUser]);

    const authGate = useMemo(() => {
        if (user) return null;
        if (isShellAuthBypassed()) return null;
        return createElement(LawyerSignInGate);
    }, [user]);

    return { user, setUser, authLoading, authGate };
}
