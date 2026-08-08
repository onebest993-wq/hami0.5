import { useEffect, useRef, useState } from 'react';
import { resolveProfileShellReady } from '@/app/services/profile/profileShellLogic';
import {
    markProfilePerfPhase,
    reportProfilePerf,
} from '@/app/services/profile/profilePerfMetrics';
import { peekProfileWarmCache } from '@/app/services/profile/profileWarmCache';

export type UseProfileLifecycleParams = {
    profileUserId: string;
    loading: boolean;
    hasHeader: boolean;
    isOwnProfile: boolean;
    perfOpenEpoch?: number;
};

export function useProfileLifecycle({
    profileUserId,
    loading,
    hasHeader,
    isOwnProfile,
    perfOpenEpoch = 0,
}: UseProfileLifecycleParams) {
    const [hadWarmCache, setHadWarmCache] = useState(() => {
        if (!profileUserId?.trim()) return false;
        return Boolean(peekProfileWarmCache(profileUserId));
    });
    const reportedRef = useRef(false);

    useEffect(() => {
        if (!profileUserId) {
            setHadWarmCache(false);
            return;
        }
        setHadWarmCache(Boolean(peekProfileWarmCache(profileUserId)));
    }, [profileUserId]);

    const isShellReady = resolveProfileShellReady({
        loading,
        hasHeader,
        hadWarmCache,
    });

    useEffect(() => {
        reportedRef.current = false;
    }, [perfOpenEpoch]);

    useEffect(() => {
        if (!isShellReady || reportedRef.current) return;
        reportedRef.current = true;
        markProfilePerfPhase('first-paint');
        markProfilePerfPhase('interactive');
        reportProfilePerf({
            userId: profileUserId,
            hadWarmCache,
            isOwnProfile,
        });
    }, [hadWarmCache, isOwnProfile, isShellReady, perfOpenEpoch, profileUserId]);

    /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخرت الجاهزية (P1/P9) */
    useEffect(() => {
        if (reportedRef.current) return;

        const markInteractiveFallback = () => {
            if (reportedRef.current) return;
            reportedRef.current = true;
            markProfilePerfPhase('first-paint');
            markProfilePerfPhase('interactive');
            reportProfilePerf({
                userId: profileUserId,
                hadWarmCache,
                isOwnProfile,
            });
        };

        const fallback = window.setTimeout(markInteractiveFallback, 1_200);
        return () => window.clearTimeout(fallback);
    }, [hadWarmCache, isOwnProfile, perfOpenEpoch, profileUserId]);

    return { isShellReady, hadWarmCache };
}
