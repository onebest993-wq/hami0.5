import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { parseCommunityDeepLinkFromLocation } from '@/app/components/lawyer/CommunityScreen/communityDeepLink';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    FORUM_SHELL_FEATURE,
    openLawyerForumFromShell,
} from '@/app/services/forum/forumShellNavigation';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import { BOOT_REVEAL_DONE_EVENT, isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { prefetchCommunityOverlayEntry } from '@/app/runtime/communityOverlayEntryLoader';
import {
    getOverlayKeepAliveIdleMs,
    useKeepAliveIdleRelease,
} from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import {
    LAWYER_COMMUNITY_OPEN_KEY,
    LAWYER_DASHBOARD_TAB_KEY,
    readInitialCommunityOpen,
    type LawyerDashboardTab,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';
import {
    ensureCommunityScreenContentLoaded,
    loadCommunityBootHydrator,
    loadCommunityScreenModule,
    loadForumIntentWarm,
    loadForumPostsWarmCache,
    prefetchCommunityHostChunks,
} from '@/app/hooks/lawyerDashboard/community/communityLazyImports';
import { commitCommunityOpen } from '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow';

export type UseLawyerDashboardCommunityParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
};

/**
 * فتح المنتدى = قشرة فورية (flushSync) ثم ملء المحتوى/المنشورات في الخلفية.
 * Host يُركَّب مخفياً بعد interactive (مثل الإعدادات) لإلغاء انتظار أول فتح بارد.
 */
export function useLawyerDashboardCommunity({ userId, activeTab }: UseLawyerDashboardCommunityParams) {
    const initialOpen = readInitialCommunityOpen();
    const [showCommunity, setShowCommunity] = useState(initialOpen);
    const [communitySessionKey, setCommunitySessionKey] = useState(0);
    const [communityHostMounted, setCommunityHostMounted] = useState(() => initialOpen);
    const showCommunityRef = useRef(false);
    showCommunityRef.current = showCommunity;
    const [communityDeepLink, setCommunityDeepLink] = useState<{
        postId?: string;
        openComments?: boolean;
    } | null>(() => {
        if (typeof window === 'undefined') return null;
        const target = parseCommunityDeepLinkFromLocation(window.location);
        return target
            ? { postId: target.postId, openComments: target.openComments }
            : null;
    });

    const armCommunityHost = useCallback(() => {
        setCommunityHostMounted(true);
        prefetchCommunityOverlayEntry();
        void loadForumIntentWarm().then((m) => m.warmForumOnHover(userId));
        void ensureDeferredFeatureStylesLoaded();
        void ensureCommunityScreenContentLoaded().catch(() => undefined);
        void loadCommunityBootHydrator()
            .then((m) => m.hydrateCommunityShellForInstantOpen())
            .catch(() => undefined);
        void loadCommunityScreenModule().catch(() => undefined);
        void import('@/app/components/lawyer/CommunityScreen/CommunityScreenHost').catch(() => undefined);
    }, [userId]);

    const closeCommunity = useCallback(() => {
        showCommunityRef.current = false;
        setShowCommunity(false);
        setCommunityDeepLink(null);
        if (typeof window !== 'undefined' && window.location.hash.includes('community/post/')) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
    }, []);

    const primeCommunityShellMount = useCallback(() => {
        armCommunityHost();
    }, [armCommunityHost]);

    useEffect(() => {
        return registerDashboardOverlayCloser('forum', () => {
            closeCommunity();
        });
    }, [closeCommunity]);

    /**
     * بعد boot-reveal: تسخين chunks + OverlayEntry
     * (تركيب Host يتم عند interactive أدناه مثل الإعدادات).
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (isLitePerformanceActive()) return;

        const scheduleWarm = () => {
            prefetchCommunityOverlayEntry();
            void loadForumIntentWarm().then((m) => m.warmForumOnHover(userId));
            void loadCommunityBootHydrator()
                .then((m) => m.prefetchForumAfterBootReveal())
                .catch(() => undefined);
            void loadForumPostsWarmCache()
                .then((m) => m.readForumPostsCache())
                .catch(() => undefined);
        };

        if (isBootRevealDone()) {
            scheduleWarm();
            return;
        }

        window.addEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
        return () => {
            window.removeEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
        };
    }, [userId]);

    /**
     * بعد interactive: prefetch OverlayEntry + تركيب Host مخفي فوراً
     * (مثل useLawyerDashboardSettings) — أول نقرة تفتح شجرة جاهزة.
     */
    useLayoutEffect(() => {
        if (isLitePerformanceActive()) return;
        return onDashboardInteractive(() => {
            prefetchCommunityOverlayEntry();
            void loadForumIntentWarm().then((m) => m.warmForumOnHover(userId));
            setCommunityHostMounted(true);
            prefetchCommunityHostChunks();
            void loadCommunityBootHydrator()
                .then((m) => m.hydrateCommunityShellForInstantOpen(false))
                .catch(() => undefined);
        });
    }, [userId]);

    /** استعادة بعد F5: ثبّت host فقط — بلا إعادة arm (الفتح يسخّن عبر warmForumOnOpen) */
    useEffect(() => {
        if (!showCommunity || !isRealSignedIn(userId)) return;
        setCommunityHostMounted(true);
        prefetchCommunityOverlayEntry();
    }, [showCommunity, userId]);

    useKeepAliveIdleRelease(showCommunity, () => {
        setCommunityHostMounted(false);
    }, getOverlayKeepAliveIdleMs());

    useEffect(() => {
        let disposed = false;
        let unbind: (() => void) | undefined;
        const unbindInteractive = onDashboardInteractive(() => {
            void loadCommunityBootHydrator().then((m) => {
                if (disposed) return;
                unbind = m.bindCommunityBootHydrator();
            });
        });
        return () => {
            disposed = true;
            unbindInteractive();
            unbind?.();
        };
    }, []);

    useEffect(() => {
        try {
            if (showCommunity) {
                sessionStorage.setItem(LAWYER_COMMUNITY_OPEN_KEY, '1');
                return;
            }
            sessionStorage.removeItem(LAWYER_COMMUNITY_OPEN_KEY);
            if (activeTab === 'schedule') {
                sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, activeTab);
            } else {
                sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
            }
        } catch {
            /* ignore storage */
        }
    }, [activeTab, showCommunity]);

    const openCommunityTab = useCallback(() => {
        openLawyerForumFromShell({
            signedIn: isRealSignedIn(userId),
            onSignedOut: () =>
                SmartToast.error(`يرجى تسجيل الدخول أولاً لاستخدام ${FORUM_SHELL_FEATURE}`),
            onOpen: () => {
                commitCommunityOpen({
                    userId,
                    showCommunityRef,
                    setCommunityHostMounted,
                    setShowCommunity,
                });
            },
        });
    }, [userId]);

    const resetCommunityScreen = useCallback(() => {
        setCommunitySessionKey((k) => k + 1);
    }, []);

    const resetCommunityShell = useCallback(() => {
        setCommunitySessionKey((k) => k + 1);
        setShowCommunity(false);
        setCommunityDeepLink(null);
    }, []);

    useEffect(() => {
        const syncCommunityHash = () => {
            const target = parseCommunityDeepLinkFromLocation(window.location);
            if (target) {
                setCommunityDeepLink((prev) => ({
                    ...prev,
                    postId: target.postId,
                    openComments: target.openComments,
                }));
                /* لا flushSync من داخل useEffect — أخّر لـ microtask */
                queueMicrotask(() => openCommunityTab());
            }
        };
        syncCommunityHash();
        window.addEventListener('hashchange', syncCommunityHash);
        return () => window.removeEventListener('hashchange', syncCommunityHash);
    }, [openCommunityTab]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const w = window as Window & {
            __hamiE2eForceOpenCommunity?: () => void;
            __hamiE2eCommunityDebug?: () => {
                showCommunity: boolean;
                communityHostMounted: boolean;
                activeTab: LawyerDashboardTab;
            };
        };
        w.__hamiE2eForceOpenCommunity = () => openCommunityTab();
        w.__hamiE2eCommunityDebug = () => ({
            showCommunity,
            communityHostMounted,
            activeTab,
        });
        return () => {
            delete w.__hamiE2eForceOpenCommunity;
            delete w.__hamiE2eCommunityDebug;
        };
    }, [activeTab, communityHostMounted, openCommunityTab, showCommunity]);

    return {
        showCommunity,
        setShowCommunity,
        communitySessionKey,
        communityHostMounted,
        communityDeepLink,
        setCommunityDeepLink,
        openCommunityTab,
        closeCommunity,
        primeCommunityShellMount,
        resetCommunityScreen,
        resetCommunityShell,
    };
}
