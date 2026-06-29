import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { resolveDevMockLawyerUser } from '@/app/services/auth/devMockLawyerAuth';
import { maybeShowWeeklyBackupReminder } from '@/app/services/settings/backupReminder';

export type UseLawyerDashboardAuthParams = {
    authUser: User | null | undefined;
    weeklyBackupReminder: boolean;
};

export function useLawyerDashboardAuth({
    authUser,
    weeklyBackupReminder,
}: UseLawyerDashboardAuthParams) {
    const [user, setUser] = useState<User | null>(() => resolveDevMockLawyerUser(authUser));
    const authLoading = false;

    useEffect(() => {
        setUser(resolveDevMockLawyerUser(authUser));
    }, [authUser]);

    useEffect(() => {
        if (!user) return;
        maybeShowWeeklyBackupReminder(weeklyBackupReminder);
    }, [user, weeklyBackupReminder]);

    return { user, setUser, authLoading, authGate: null };
}
