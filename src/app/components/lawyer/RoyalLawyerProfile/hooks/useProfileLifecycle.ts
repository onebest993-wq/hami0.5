import { useEffect, useState } from 'react';
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
    const [hadWarmCache, setHadWarmCache] = useState(false);

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
        if (!isShellReady) return;
        markProfilePerfPhase('first-paint');
        markProfilePerfPhase('interactive');
        reportProfilePerf({
            userId: profileUserId,
            hadWarmCache,
            isOwnProfile,
        });
    }, [hadWarmCache, isOwnProfile, isShellReady, perfOpenEpoch, profileUserId]);

    return { isShellReady, hadWarmCache };
}
