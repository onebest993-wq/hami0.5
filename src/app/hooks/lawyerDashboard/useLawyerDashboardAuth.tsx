import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createGuestLawyerSession } from '@/app/utils/guestLawyerSession';
import { maybeShowWeeklyBackupReminder } from '@/app/services/settings/backupReminder';

export type UseLawyerDashboardAuthParams = {
    authUser: User | null | undefined;
    weeklyBackupReminder: boolean;
};

export function useLawyerDashboardAuth({
    authUser,
    weeklyBackupReminder,
}: UseLawyerDashboardAuthParams) {
    const guest = createGuestLawyerSession();
    const [user, setUser] = useState<User | null>(authUser ?? guest.user);
    const authLoading = false;

    useEffect(() => {
        if (authUser) {
            setUser(authUser);
        }
    }, [authUser]);

    useEffect(() => {
        if (!user) return;
        maybeShowWeeklyBackupReminder(weeklyBackupReminder);
    }, [user, weeklyBackupReminder]);

    return { user, setUser, authLoading, authGate: null };
}
