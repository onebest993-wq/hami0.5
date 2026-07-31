import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openProfileFromShell,
    PROFILE_SHELL_FEATURE,
} from '@/app/services/profile/profileShellNavigation';
import { clearPersistedLawyerProfileTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    scheduleProfileShellReactSync,
    snapProfileShellClose,
    isProfileShellSnappedOpen,
    snapProfileShellOpen,
} from '@/app/services/profile/profileShellSnap';
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

export type UseLawyerDashboardProfileTabParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
    setActiveTab: Dispatch<SetStateAction<LawyerDashboardTab>>;
    setShowCommunity: (open: boolean) => void;
};

export function useLawyerDashboardProfileTab({
    userId,
    activeTab,
    setActiveTab,
    setShowCommunity,
}: UseLawyerDashboardProfileTabParams) {
    const profileInitiallyOpen = activeTab === 'profile';
    const [profileTabSessionKey, setProfileTabSessionKey] = useState(0);
    const [profileOpenEpoch, setProfileOpenEpoch] = useState(0);
    const [profileHostMounted, setProfileHostMounted] = useState(() => profileInitiallyOpen);
    const openInFlightRef = useRef(false);

    const armProfileHost = useCallback(() => {
        setProfileHostMounted((prev) => {
            if (prev) return prev;
            return true;
        });
        queueMicrotask(() => {
            prefetchProfileShellChunks();
        });
    }, []);

    const primeProfileTabMount = useCallback(() => {
        void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
        armProfileHost();
        void loadProfileBootHydrator().then((m) => m.dispatchProfilePrimeHost());
    }, [armProfileHost, userId]);

    const closeProfileTab = useCallback(() => {
        snapProfileShellClose();
        clearPersistedLawyerProfileTab();
        scheduleProfileShellReactSync(() => {
            setActiveTab('home');
        });
    }, [setActiveTab]);

    useEffect(() => {
        if (isRealSignedIn(userId)) return;
        setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
        setProfileHostMounted(false);
    }, [userId, setActiveTab]);

    useEffect(() => {
        const closeProfile = () => {
            snapProfileShellClose();
            setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
        };
        const unregProfile = registerDashboardOverlayCloser('profile', closeProfile);
        return () => {
            unregProfile();
        };
    }, [setActiveTab]);

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
            snapProfileShellOpen();
        }
        queueMicrotask(() => {
            prefetchProfileShellChunks();
            void loadProfileIntentWarm().then((m) => m.warmProfileOnOpen(userId));
            void loadProfileBootHydrator()
                .then((m) => m.hydrateProfileShellForInstantOpenWithData(userId, true))
                .catch(() => undefined);
        });
    }, [activeTab, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isRealSignedIn(userId)) return;

        const scheduleWarm = () => {
            armProfileHost();
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
    }, [armProfileHost, userId]);

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
        w.__hamiE2eProfileTabDebug = () => ({ activeTab, profileHostMounted });
        return () => {
            delete w.__hamiE2eForceOpenProfileTab;
            delete w.__hamiE2eProfileTabDebug;
        };
    }, [activeTab, openProfileTab, profileHostMounted]);

    return {
        profileTabSessionKey,
        profileOpenEpoch,
        profileHostMounted,
        primeProfileTabMount,
        resetProfileTabShell,
        openProfileTab,
        closeProfileTab,
    };
}
