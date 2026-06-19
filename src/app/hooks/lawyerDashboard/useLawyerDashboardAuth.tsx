import React, { Suspense, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { debug } from '@/app/utils/debug';
import { supabase } from '@/app/lib/supabase-client';
import { LazyLawyerAuth } from '@/app/utils/lazyComponents';
import { maybeShowWeeklyBackupReminder } from '@/app/services/settings/backupReminder';

const AUTH_TIMEOUT_MS = 8000;

export type UseLawyerDashboardAuthParams = {
    authUser: User | null | undefined;
    weeklyBackupReminder: boolean;
};

export function useLawyerDashboardAuth({
    authUser,
    weeklyBackupReminder,
}: UseLawyerDashboardAuthParams) {
    const [user, setUser] = useState<User | null>(authUser ?? null);
    const [authLoading, setAuthLoading] = useState(() => !authUser);

    useEffect(() => {
        if (authUser) {
            setUser((prev) => prev ?? authUser);
            setAuthLoading(false);
            return;
        }
        const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Auth timeout')), AUTH_TIMEOUT_MS),
        );
        const initCloud = async () => {
            try {
                const result = (await Promise.race([
                    supabase.auth.getSession(),
                    timeoutPromise.then(() => ({ data: { session: null } })),
                ])) as { data: { session: Session | null } };
                const session = result.data.session;

                if (session?.user) {
                    setUser(session.user);
                    setAuthLoading(false);
                    const runDeadlineCheck = () => {
                        void import('@/app/services/lawyer-cloud')
                            .then(({ LawyerDB }) => LawyerDB.checkUpcomingDeadlines(session.user.id))
                            .then((due) => {
                                if (due && due.length > 0) {
                                    SmartToast.warning(
                                        `⚠️ تنبيه قضائي: لديك ${due.length} مواعيد تنتهي غداً!`,
                                        8000,
                                    );
                                }
                            })
                            .catch(debug.error);
                    };
                    if (typeof requestIdleCallback !== 'undefined') {
                        requestIdleCallback(runDeadlineCheck, { timeout: 8_000 });
                    } else {
                        window.setTimeout(runDeadlineCheck, 2_000);
                    }
                } else {
                    setAuthLoading(false);
                }
            } catch {
                setAuthLoading(false);
            }
        };
        void initCloud();
    }, [authUser]);

    useEffect(() => {
        if (authLoading || !user) return;
        maybeShowWeeklyBackupReminder(weeklyBackupReminder);
    }, [authLoading, user, weeklyBackupReminder]);

    const authGate =
        authLoading && !user ? (
            <div className="min-h-screen bg-[#0B1021] flex items-center justify-center">
                <div className="text-[#E6C673]/70 text-sm font-bold animate-pulse">جاري التحقق...</div>
            </div>
        ) : !user ? (
            <Suspense fallback={<div className="min-h-screen bg-[#0B1021]" />}>
                <LazyLawyerAuth onLoginSuccess={setUser} />
            </Suspense>
        ) : null;

    return { user, setUser, authLoading, authGate };
}
