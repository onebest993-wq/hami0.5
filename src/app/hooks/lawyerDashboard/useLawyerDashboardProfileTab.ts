import { useCallback, useEffect, useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openProfileFromShell,
    PROFILE_SHELL_FEATURE,
} from '@/app/services/profile/profileShellNavigation';
import { resetProfileShellOnColdDashboardBoot } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    isProfileShellSnappedOpen,
} from '@/app/services/profile/profileShellSnap';
import {
    concealProfileWarmShell,
    revealProfileWarmShell,
} from '@/app/runtime/profileInstantPaint';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import {
    loadProfileBootHydrator,
    loadProfileIntentWarm,
    PROFILE_PRIME_HOST_EVENT,
    prefetchProfileShellChunks,
} from '@/app/hooks/lawyerDashboard/profile/profileLazyImports';
import { commitProfileOpen } from '@/app/hooks/lawyerDashboard/profile/profileShellOpenFlow';
import {
    commitProfileClose,
    commitProfileOverlayDismiss,
} from '@/app/hooks/lawyerDashboard/profile/profileShellCloseFlow';
import { useProfileShellReadiness } from '@/app/hooks/lawyerDashboard/profile/useProfileShellReadiness';
import { markProfilePerfPhase, getProfilePerfSnapshot } from '@/app/services/profile/profilePerfMetrics';

export type UseLawyerDashboardProfileTabParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setShowCommunity: (open: boolean) => void;
    /** إغلاق مركز الإعدادات — يمنع ظهوره بعد الرجوع من الملف (keep-alive) */
    closeSettings?: () => void;
};

export function useLawyerDashboardProfileTab({
    userId,
    activeTab,
    setActiveTab,
    setShowCommunity,
    closeSettings,
}: UseLawyerDashboardProfileTabParams) {
    const profileInitiallyOpen = activeTab === 'profile';
    const [profileTabSessionKey, setProfileTabSessionKey] = useState(0);
    const [profileOpenEpoch, setProfileOpenEpoch] = useState(0);
    const [profileHostMounted, setProfileHostMounted] = useState(() => profileInitiallyOpen);
    const openInFlightRef = useRef(false);

    useLayoutEffect(() => {
        resetProfileShellOnColdDashboardBoot();
    }, []);

    const armProfileHost = useCallback(() => {
        setProfileHostMounted((prev) => {
            if (prev) return prev;
            return true;
        });
        prefetchProfileShellChunks();
    }, []);

    const primeProfileTabMount = useCallback(() => {
        flushSync(() => {
            armProfileHost();
        });
        void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
        void loadProfileBootHydrator().then((m) => m.dispatchProfilePrimeHost());
    }, [armProfileHost, userId]);

    const closeProfileTab = useCallback(() => {
        commitProfileClose({ closeSettings, setActiveTab });
    }, [closeSettings, setActiveTab]);

    const { ready: profileShellReady, warming: profileShellWarming } = useProfileShellReadiness({
        userId,
        hostMounted: profileHostMounted,
    });

    /** ركّب Host مخفياً فور وجود هوية — قبل أول لمسة ملف (مثل التقويم/المعاملات) */
    useLayoutEffect(() => {
        const uid = userId?.trim();
        if (!uid || !isRealSignedIn(uid)) return;
        armProfileHost();
        void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(uid));
        void loadProfileBootHydrator()
            .then((m) => m.hydrateProfileShellForInstantOpenWithData(uid, true))
            .catch(() => undefined);
        void import('@/app/runtime/profileHubLoader')
            .then((m) => m.loadProfileHubModule())
            .catch(() => undefined);
    }, [armProfileHost, userId]);

    useLayoutEffect(() => {
        if (activeTab !== 'home' || !isProfileShellSnappedOpen()) return;
        concealProfileWarmShell();
    }, [activeTab]);

    useEffect(() => {
        if (isRealSignedIn(userId)) return;
        setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
        setProfileHostMounted(false);
    }, [userId, setActiveTab]);

    useEffect(() => {
        const closeProfile = () => {
            commitProfileOverlayDismiss({ closeSettings, setActiveTab });
        };
        const unregProfile = registerDashboardOverlayCloser('profile', closeProfile);
        return () => {
            unregProfile();
        };
    }, [closeSettings, setActiveTab]);

    useEffect(() => {
        let disposed = false;
        let unbind: (() => void) | undefined;
        const unbindInteractive = onDashboardInteractive(() => {
            void loadProfileBootHydrator().then((m) => {
                if (disposed) return;
                unbind = m.bindProfileBootHydrator(userId);
            });
        });
        return () => {
            disposed = true;
            unbindInteractive();
            unbind?.();
        };
    }, [userId]);

    useLayoutEffect(() => {
        if (activeTab !== 'profile') return;
        setProfileHostMounted(true);
        if (!isProfileShellSnappedOpen()) {
            revealProfileWarmShell();
        }
    }, [activeTab]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isRealSignedIn(userId)) return;

        const scheduleWarm = () => {
            /* prefetch فقط — لا تركيب Host هنا (كان يُركّب الملف مخفياً ويظهر أحياناً بعد reload) */
            void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
            void loadProfileBootHydrator()
                .then((m) => m.prefetchProfileAfterBootReveal(userId))
                .catch(() => undefined);
        };

        if (isBootRevealDone()) {
            scheduleWarm();
            return;
        }

        window.addEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
        return () => window.removeEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
    }, [userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPrime = () => {
            armProfileHost();
            void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
            void loadProfileBootHydrator()
                .then((m) => m.hydrateProfileShellForInstantOpenWithData(userId, true))
                .catch(() => undefined);
        };
        window.addEventListener(PROFILE_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(PROFILE_PRIME_HOST_EVENT, onPrime);
    }, [armProfileHost, userId]);

    const openProfileTab = useCallback(() => {
        openProfileFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${PROFILE_SHELL_FEATURE}`),
            onOpen: () => {
                commitProfileOpen({
                    userId,
                    openInFlightRef,
                    setProfileHostMounted,
                    setShowCommunity,
                    setActiveTab,
                    setProfileOpenEpoch,
                });
                void loadProfileBootHydrator()
                    .then((m) => m.hydrateProfileShellForInstantOpenWithData(userId, true))
                    .catch(() => undefined);
            },
        });
    }, [setActiveTab, setShowCommunity, userId]);

    const resetProfileTabShell = useCallback(() => {
        setProfileTabSessionKey((k) => k + 1);
        setProfileOpenEpoch(0);
    }, []);

    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceOpenProfileTab?: () => void;
            __hamiE2eProfileTabDebug?: () => {
                activeTab: LawyerDashboardTab;
                profileHostMounted: boolean;
            };
        };
        w.__hamiE2eForceOpenProfileTab = () => openProfileTab();
        w.__hamiE2eProfileTabDebug = () => ({
            activeTab,
            profileHostMounted,
            profileShellReady,
            profileShellWarming,
            perf: getProfilePerfSnapshot(),
        });
        w.__hamiProfilePerfSnapshot = () => getProfilePerfSnapshot();
        return () => {
            delete w.__hamiE2eForceOpenProfileTab;
            delete w.__hamiE2eProfileTabDebug;
        };
    }, [activeTab, openProfileTab, profileHostMounted, profileShellReady, profileShellWarming]);

    return {
        profileTabSessionKey,
        profileOpenEpoch,
        profileHostMounted,
        profileShellReady,
        profileShellWarming,
        primeProfileTabMount,
        resetProfileTabShell,
        openProfileTab,
        closeProfileTab,
    };
}
