import { useEffect, useRef, useState } from 'react';
import { resolveProfileShellReady } from '@/app/services/profile/profileShellPolicy';
import {
    markProfilePerfPhase,
    reportProfilePerf,
} from '@/app/services/profile/profilePerfMetrics';
import { peekProfileWarmCache } from '@/app/services/profile/profileWarmCache';

let sessionIdCounter = 0;

type UseProfileLifecycleParams = {
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
    const sessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

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

        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;

        reportedRef.current = true;
        if (sessionIdRef.current !== activeSessionIdRef.current) return;
        markProfilePerfPhase('first-paint');
        markProfilePerfPhase('interactive');
        reportProfilePerf({
            userId: profileUserId,
            hadWarmCache,
            isOwnProfile,
        });
        return () => {
            if (activeSessionIdRef.current === thisSessionId) {
                activeSessionIdRef.current = 0;
            }
        };
    }, [hadWarmCache, isOwnProfile, isShellReady, perfOpenEpoch, profileUserId]);

    /* احتياطي — لا يبقى open→interactive معلّقاً إن تأخرت الجاهزية (P1/P9) */
    useEffect(() => {
        if (reportedRef.current) return;

        sessionIdCounter += 1;
        const thisSessionId = sessionIdCounter;
        sessionIdRef.current = thisSessionId;
        activeSessionIdRef.current = thisSessionId;

        const markInteractiveFallback = () => {
            if (sessionIdRef.current !== thisSessionId) return;
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
        return () => {
            if (activeSessionIdRef.current === thisSessionId) {
                activeSessionIdRef.current = 0;
            }
            window.clearTimeout(fallback);
        };
    }, [hadWarmCache, isOwnProfile, perfOpenEpoch, profileUserId]);

    return { isShellReady, hadWarmCache };
}
