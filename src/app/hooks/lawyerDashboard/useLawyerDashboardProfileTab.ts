import {
    useCallback,
    useEffect,
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
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import {
    clearProfilePerfMarks,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';
import { hydrateProfileShellForInstantOpenWithData } from '@/app/runtime/profileBootHydrator';

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
    const [profileTabSessionKey, setProfileTabSessionKey] = useState(0);
    const [profileOpenEpoch, setProfileOpenEpoch] = useState(0);
    const openInFlightRef = useRef(false);

    const primeProfileTabMount = useCallback(() => {
        warmProfileOnHover(userId);
    }, [userId]);

    const closeProfileTab = useCallback(() => {
        setActiveTab('home');
    }, [setActiveTab]);

    useEffect(() => {
        const closeProfile = () => {
            setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
        };
        const unregProfile = registerDashboardOverlayCloser('profile', closeProfile);
        return () => {
            unregProfile();
        };
    }, [setActiveTab]);

    const openProfileTab = useCallback(() => {
        openProfileFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${PROFILE_SHELL_FEATURE}`),
            onOpen: () => {
                if (activeTab === 'profile' || openInFlightRef.current) return;
                openInFlightRef.current = true;
                try {
                    clearProfilePerfMarks();
                    markProfilePerfPhase('open-request');
                    warmProfileOnOpen(userId);
                    setShowCommunity(false);
                    setActiveTab('profile');
                    setProfileOpenEpoch((epoch) => epoch + 1);
                    queueMicrotask(() => dismissTransientOverlays('profile'));
                    void hydrateProfileShellForInstantOpenWithData(userId, true)
                        .catch(() => undefined)
                        .then(() => markProfilePerfPhase('chunk-ready'));
                } finally {
                    queueMicrotask(() => {
                        openInFlightRef.current = false;
                    });
                }
            },
        });
    }, [activeTab, setActiveTab, setShowCommunity, userId]);

    const resetProfileTabShell = useCallback(() => {
        setProfileTabSessionKey((k) => k + 1);
        setProfileOpenEpoch(0);
    }, []);

    useEffect(() => {
        if (!import.meta.env.DEV || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceOpenProfileTab?: () => void;
            __hamiE2eProfileTabDebug?: () => { activeTab: LawyerDashboardTab };
        };
        w.__hamiE2eForceOpenProfileTab = () => openProfileTab();
        w.__hamiE2eProfileTabDebug = () => ({ activeTab });
        return () => {
            delete w.__hamiE2eForceOpenProfileTab;
            delete w.__hamiE2eProfileTabDebug;
        };
    }, [activeTab, openProfileTab]);

    return {
        profileTabSessionKey,
        profileOpenEpoch,
        primeProfileTabMount,
        resetProfileTabShell,
        openProfileTab,
        closeProfileTab,
    };
}
