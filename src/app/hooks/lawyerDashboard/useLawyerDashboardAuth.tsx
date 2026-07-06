import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { resolveDevMockLawyerUser } from '@/app/services/auth/devMockLawyerAuth';

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

    return { user, setUser, authLoading, authGate: null };
}
