import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type Dispatch,
    type SetStateAction,
} from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    openProfileFromShell,
    PROFILE_SHELL_FEATURE,
} from '@/app/services/profile/profileShellNavigation';
import {
    dismissTransientOverlays,
    HAMI_DISMISS_OVERLAYS_EVENT,
    type TransientOverlayId,
} from '@/app/utils/bodyScrollLock';
import type { LawyerDashboardTab } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import { warmProfileOnHover, warmProfileOnOpen } from '@/app/hooks/lawyerDashboard/profileIntentWarm';
import {
    clearProfilePerfMarks,
    markProfilePerfPhase,
} from '@/app/services/profile/profilePerfMetrics';
import { loadRoyalLawyerProfileModule } from '@/app/runtime/royalLawyerProfileLoader';

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
    const profileTabActiveRef = useRef(false);
    const openInFlightRef = useRef(false);
    profileTabActiveRef.current = activeTab === 'profile';

    const primeProfileTabMount = useCallback(() => {
        warmProfileOnHover(userId);
    }, [userId]);

    const closeProfileTab = useCallback(() => {
        profileTabActiveRef.current = false;
        setActiveTab('home');
    }, [setActiveTab]);

    useEffect(() => {
        const onDismiss = (e: Event) => {
            const except = (e as CustomEvent<{ except?: TransientOverlayId }>).detail?.except;
            if (except === 'profile-settings' || except === 'profile') return;
            setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
        };
        window.addEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
        return () => window.removeEventListener(HAMI_DISMISS_OVERLAYS_EVENT, onDismiss);
    }, [setActiveTab]);

    const openProfileTab = useCallback(() => {
        openProfileFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${PROFILE_SHELL_FEATURE}`),
            onOpen: () => {
                if (profileTabActiveRef.current || openInFlightRef.current) return;
                openInFlightRef.current = true;
                try {
                    clearProfilePerfMarks();
                    markProfilePerfPhase('open-request');
                    warmProfileOnOpen(userId);
                    flushSync(() => {
                        setShowCommunity(false);
                        setActiveTab('profile');
                    });
                    profileTabActiveRef.current = true;
                    setProfileOpenEpoch((epoch) => epoch + 1);
                    queueMicrotask(() => dismissTransientOverlays('profile'));
                    void loadRoyalLawyerProfileModule(userId)
                        .catch(() => undefined)
                        .then(() => markProfilePerfPhase('chunk-ready'));
                } finally {
                    openInFlightRef.current = false;
                }
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
