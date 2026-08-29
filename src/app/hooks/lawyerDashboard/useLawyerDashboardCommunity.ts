import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { parseCommunityDeepLinkFromLocation } from '@/app/components/lawyer/CommunityScreen/communityDeepLink';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import { openLawyerForumFromShell } from '@/app/services/forum/forumShellNavigation';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import { onDashboardInteractive } from '@/app/bootstrap/bootMetrics';
import {
    BOOT_REVEAL_DONE_EVENT,
    isBootRevealDone,
} from '@/app/bootstrap/bootReveal';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
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
    prefetchCommunityHostChunks,
} from '@/app/hooks/lawyerDashboard/community/communityLazyImports';
import {
    commitCommunityClose,
    commitCommunityOpen,
    isCommunityOpenInFlight,
} from '@/app/hooks/lawyerDashboard/community/communityShellOpenFlow';
import {
    concealForumWarmShell,
    isForumShellPaintedOpen,
    paintForumInstantChrome,
} from '@/app/runtime/forumInstantPaint';
import { consumeForumOpenPostId, isForumOpenIntentPending } from '@/app/runtime/forumOpenIntent';
import { deferShellConcealAfterHandoff, isShellHandoffPending } from '@/app/runtime/sectionShellHandoff';

export type UseLawyerDashboardCommunityParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
};

/**
 * فتح المنتدى = انتظار مقطع Entry ثم flushSync، ثم ملء المحتوى في الخلفية.
 * Host يُركَّب عند الفتح. التسخين الخلفي بعد boot-reveal فقط (لا interactive قبل uncover).
 */
export function useLawyerDashboardCommunity({ userId, activeTab }: UseLawyerDashboardCommunityParams) {
    const initialOpen = readInitialCommunityOpen();
    const [showCommunity, setShowCommunity] = useState(initialOpen);
    const [communitySessionKey, setCommunitySessionKey] = useState(0);
    const [communityHostMounted, setCommunityHostMounted] = useState(() => initialOpen);
    const showCommunityRef = useRef(false);
    showCommunityRef.current = showCommunity;
    const communityHostMountedRef = useRef(communityHostMounted);
    communityHostMountedRef.current = communityHostMounted;
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

    const warmCommunityPrimeChain = useCallback(() => {
        prefetchCommunityOverlayEntry();
        prefetchCommunityHostChunks();
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
        commitCommunityClose({
            setShowCommunity,
            setCommunityDeepLink,
            setCommunityHostMounted,
        });
    }, []);

    /** لمسة البلاطة: تسخين بلا تركيب Host حتى الفتح */
    const primeCommunityShellMount = useCallback(() => {
        warmCommunityPrimeChain();
    }, [warmCommunityPrimeChain]);

    useEffect(() => {
        return registerDashboardOverlayCloser('forum', () => {
            closeCommunity();
        });
    }, [closeCommunity]);

    /**
     * بعد boot-reveal فقط: تسخين عبر hydrator (idle + KYC).
     * interactive يُعلَن قبل uncover — أي prefetch هنا كان ينافس تلاشي الشعار.
     */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!isRealSignedIn(userId)) return;
        const scheduleWarm = () => {
            void loadCommunityBootHydrator()
                .then((m) => m.prefetchForumAfterBootReveal())
                .catch(() => undefined);
        };
        if (isBootRevealDone()) {
            scheduleWarm();
            return;
        }
        window.addEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
        return () => window.removeEventListener(BOOT_REVEAL_DONE_EVENT, scheduleWarm);
    }, [userId]);

    /** استعادة بعد F5: ثبّت host فقط — بلا إعادة arm (الفتح يسخّن عبر warmForumOnOpen) */
    useEffect(() => {
        if (!showCommunity || !isRealSignedIn(userId)) return;
        setCommunityHostMounted(true);
        prefetchCommunityOverlayEntry();
    }, [showCommunity, userId]);

    useLayoutEffect(() => {
        if (showCommunity) {
            paintForumInstantChrome();
            return;
        }
        return deferShellConcealAfterHandoff(() => {
            if (
                isCommunityOpenInFlight() ||
                showCommunityRef.current ||
                isForumOpenIntentPending() ||
                isShellHandoffPending('community')
            ) {
                return;
            }
            if (isForumShellPaintedOpen()) concealForumWarmShell();
        });
    }, [showCommunity]);

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
        const postId = consumeForumOpenPostId();
        if (postId) {
            setCommunityDeepLink({ postId, openComments: false });
        }
        // افتح سطح المنتدى دائماً — الضيف يرى بوابة دخول/تسجيل داخل الشاشة
        openLawyerForumFromShell({
            signedIn: true,
            onOpen: () => {
                commitCommunityOpen({
                    userId,
                    showCommunityRef,
                    setCommunityHostMounted,
                    setShowCommunity,
                    hostAlreadyMounted: communityHostMountedRef.current,
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
        setCommunityHostMounted(false);
    }, []);

    useEffect(() => {
        const syncCommunityHash = () => {
            const target = parseCommunityDeepLinkFromLocation(window.location);
            if (target) {
                setCommunityDeepLink((prev) => {
                    if (
                        prev?.postId === target.postId &&
                        prev?.openComments === target.openComments
                    ) {
                        return prev;
                    }
                    return { postId: target.postId, openComments: target.openComments };
                });
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
