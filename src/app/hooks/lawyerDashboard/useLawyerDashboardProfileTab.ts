import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { hasLocalAppSession } from '@/app/services/auth/shellAuth';
import {
    openProfileFromShell,
    PROFILE_SHELL_FEATURE,
} from '@/app/services/profile/profileShellPolicy';
import { resetProfileShellOnColdDashboardBoot } from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    isProfileShellSnappedOpen,
    clearProfileShellClosing,
} from '@/app/services/profile/profileShellSnap';
import {
    concealProfileWarmShell,
    PROFILE_LIVE_SHELL_READY_EVENT,
} from '@/app/runtime/profileInstantPaint';
import { deferShellConcealAfterHandoff, isShellHandoffPending } from '@/app/runtime/sectionShellHandoff';
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
import { wasProfileOpenedThisPage } from '@/app/hooks/lawyerDashboard/profile/profileOpenSession';
import { scheduleProfileHostIdleRelease } from '@/app/hooks/lawyerDashboard/profile/profileHostIdleRelease';
import { isViteE2eHooksEnabled } from '@/app/utils/viteE2eHooks';
import { getProfilePerfSnapshot } from '@/app/services/profile/profilePerfMetrics';

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
    const [profileOpenEpoch, setProfileOpenEpoch] = useState(0);
    const [profileHostMounted, setProfileHostMounted] = useState(() => profileInitiallyOpen);
    const openInFlightRef = useRef(false);

    useLayoutEffect(() => {
        /* لا تمسح snap قائم: التسليح الكسول بعد نقرة البلاطة كان يغلق الملف ثم يعيد فتحه */
        if (wasProfileOpenedThisPage() || isProfileShellSnappedOpen()) return;
        concealProfileWarmShell();
        resetProfileShellOnColdDashboardBoot();
        setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
    }, [setActiveTab]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPageShow = (event: PageTransitionEvent) => {
            if (!event.persisted) return;
            if (wasProfileOpenedThisPage()) return;
            concealProfileWarmShell();
            resetProfileShellOnColdDashboardBoot();
            setActiveTab((tab) => (tab === 'profile' ? 'home' : tab));
        };
        window.addEventListener('pageshow', onPageShow);
        return () => window.removeEventListener('pageshow', onPageShow);
    }, [setActiveTab]);

    const armProfileHost = useCallback(() => {
        setProfileHostMounted((prev) => {
            if (prev) return prev;
            return true;
        });
        prefetchProfileShellChunks();
    }, []);

    const primeProfileTabMount = useCallback(() => {
        /* لا flushSync إن Host مركّب — تجنّب تجميد إيماءة الفتح (مثل الإعدادات) */
        const surfaceReady =
            typeof document !== 'undefined' &&
            Boolean(document.querySelector('[data-testid="lawyer-dashboard-profile-surface"]'));
        if (profileHostMounted || surfaceReady) {
            prefetchProfileShellChunks();
            void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
            return;
        }
        /*
         * لا flushSync داخل دورة React — كان يُحذّر ويُجمّد الإقلاع.
         * microtask يكفي لتجهيز Host قبل click دون كسر التزامن.
         */
        queueMicrotask(() => {
            armProfileHost();
        });
        prefetchProfileShellChunks();
        void loadProfileIntentWarm().then((m) => m.warmProfileOnHover(userId));
        void loadProfileBootHydrator().then((m) => m.dispatchProfilePrimeHost());
    }, [armProfileHost, profileHostMounted, userId]);

    const closeProfileTab = useCallback(() => {
        commitProfileClose({ closeSettings, setActiveTab });
    }, [closeSettings, setActiveTab]);

    /**
     * جلسة محلية: تسخين بيانات فقط.
     * لا armProfileHost هنا — تركيب الشجرة عند الإقلاع كان يُظهر الملف بعد F5.
     * مقطع Royal يُحمَّل عند نية الفتح (prime / pointerdown) لا على كل إقلاع.
     */
    useLayoutEffect(() => {
        const uid = userId?.trim();
        if (!uid || !hasLocalAppSession(uid)) return;
        void loadProfileBootHydrator()
            .then((m) => m.prefetchProfileAfterBootReveal(uid))
            .catch(() => undefined);
    }, [userId]);

    useLayoutEffect(() => {
        if (activeTab !== 'home' || !isProfileShellSnappedOpen()) return;
        return deferShellConcealAfterHandoff(() => {
            if (isShellHandoffPending('profile')) return;
            if (!isProfileShellSnappedOpen()) return;
            /*
             * snap ما زال مفتوحاً والنية قائمة — أصلح activeTab بدل طرد المستخدم.
             * (فتح استوديو/ستارة كان يصفّر التبويب للرئيسية فيُخفى الملف فوق الاستوديو.)
             */
            if (wasProfileOpenedThisPage()) {
                setActiveTab('profile');
                return;
            }
            concealProfileWarmShell();
        });
    }, [activeTab, setActiveTab]);

    useLayoutEffect(() => {
        if (wasProfileOpenedThisPage() || isProfileShellSnappedOpen()) return;
        clearProfileShellClosing();
    }, [activeTab]);

    useEffect(() => {
        if (hasLocalAppSession(userId)) return;
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
            if (disposed) return;
            armProfileHost();
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
    }, [armProfileHost, userId]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onLive = () => {
            setProfileHostMounted(true);
            /* حدث مؤجّل بعد الإغلاق كان يعيد التبويب بلا snap فيغطّي الرئيسية */
            if (wasProfileOpenedThisPage() || isProfileShellSnappedOpen()) {
                setActiveTab('profile');
            }
        };
        window.addEventListener(PROFILE_LIVE_SHELL_READY_EVENT, onLive);
        return () => window.removeEventListener(PROFILE_LIVE_SHELL_READY_EVENT, onLive);
    }, [setActiveTab]);

    useLayoutEffect(() => {
        if (activeTab !== 'profile') return;
        setProfileHostMounted(true);
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'profile' || !profileHostMounted) return;
        return scheduleProfileHostIdleRelease(() => {
            setProfileHostMounted(false);
        });
    }, [activeTab, profileHostMounted]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!hasLocalAppSession(userId)) return;

        const scheduleWarm = () => {
            /* prefetch بيانات فقط — لا تركيب Host هنا (كان يُركّب الملف مخفياً ويظهر أحياناً بعد reload) */
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
            signedIn: hasLocalAppSession(userId),
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

    const openProfileTabRef = useRef(openProfileTab);
    openProfileTabRef.current = openProfileTab;
    const e2eDebugRef = useRef({ activeTab, profileHostMounted });
    e2eDebugRef.current = { activeTab, profileHostMounted };

    useEffect(() => {
        if (!isViteE2eHooksEnabled() || typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceOpenProfileTab?: () => void;
            __hamiE2eProfileTabDebug?: () => {
                activeTab: LawyerDashboardTab;
                profileHostMounted: boolean;
            };
            __hamiProfilePerfSnapshot?: () => ReturnType<typeof getProfilePerfSnapshot>;
        };
        w.__hamiE2eForceOpenProfileTab = () => openProfileTabRef.current();
        w.__hamiE2eProfileTabDebug = () => ({
            activeTab: e2eDebugRef.current.activeTab,
            profileHostMounted: e2eDebugRef.current.profileHostMounted,
            perf: getProfilePerfSnapshot(),
        });
        w.__hamiProfilePerfSnapshot = () => getProfilePerfSnapshot();
        return () => {
            delete w.__hamiE2eForceOpenProfileTab;
            delete w.__hamiE2eProfileTabDebug;
            delete w.__hamiProfilePerfSnapshot;
        };
    }, []);

    return useMemo(
        () => ({
            profileOpenEpoch,
            profileHostMounted,
            primeProfileTabMount,
            openProfileTab,
            closeProfileTab,
        }),
        [
            closeProfileTab,
            openProfileTab,
            primeProfileTabMount,
            profileHostMounted,
            profileOpenEpoch,
        ],
    );
}
