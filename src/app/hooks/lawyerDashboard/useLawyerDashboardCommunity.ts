import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { SmartToast } from '@/app/components/ui/SmartToast';
import { parseCommunityDeepLinkFromLocation } from '@/app/components/lawyer/CommunityScreen/communityDeepLink';
import { isRealSignedIn } from '@/app/services/auth/shellAuth';
import {
    FORUM_SHELL_FEATURE,
    openLawyerForumFromShell,
} from '@/app/services/forum/forumShellNavigation';
import {
    warmForumOnHover,
    warmForumOnOpen,
} from '@/app/hooks/lawyerDashboard/forumIntentWarm';
import { markForumPerfPhase, clearForumPerfMarks } from '@/app/services/forum/forumPerfMetrics';
import { loadCommunityScreenModule } from '@/app/runtime/communityHubLoader';
import { hydrateCommunityShellForInstantOpen } from '@/app/runtime/communityBootHydrator';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { readForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import {
    dismissTransientOverlays,
} from '@/app/utils/bodyScrollLock';
import { registerDashboardOverlayCloser } from '@/app/hooks/lawyerDashboard/dashboardOverlayCoordinator';
import {
    LAWYER_COMMUNITY_OPEN_KEY,
    LAWYER_DASHBOARD_TAB_KEY,
    readInitialCommunityOpen,
    type LawyerDashboardTab,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

export type UseLawyerDashboardCommunityParams = {
    userId: string | null;
    activeTab: LawyerDashboardTab;
};

export function useLawyerDashboardCommunity({ userId, activeTab }: UseLawyerDashboardCommunityParams) {
    const initialOpen = readInitialCommunityOpen();
    const [showCommunity, setShowCommunity] = useState(initialOpen);
    const [communitySessionKey, setCommunitySessionKey] = useState(0);
    const showCommunityRef = useRef(false);
    const openInFlightRef = useRef(false);
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

    const closeCommunity = useCallback(() => {
        showCommunityRef.current = false;
        setShowCommunity(false);
        setCommunityDeepLink(null);
        if (typeof window !== 'undefined' && window.location.hash.includes('community/post/')) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
        }
    }, []);

    const primeCommunityShellMount = useCallback(() => {
        warmForumOnHover();
        void hydrateCommunityShellForInstantOpen().catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!isRealSignedIn(userId)) return;
        warmForumOnHover();
        void hydrateCommunityShellForInstantOpen().catch(() => undefined);
        return scheduleIdleWork(
            () => {
                void hydrateCommunityShellForInstantOpen().catch(() => undefined);
            },
            { minDelayMs: 0, timeoutMs: 4_000 },
        );
    }, [userId]);

    useEffect(() => {
        return registerDashboardOverlayCloser('forum', () => {
            setShowCommunity(false);
            setCommunityDeepLink(null);
        });
    }, []);

    useEffect(() => {
        try {
            if (showCommunity) {
                sessionStorage.setItem(LAWYER_COMMUNITY_OPEN_KEY, '1');
                return;
            }
            sessionStorage.removeItem(LAWYER_COMMUNITY_OPEN_KEY);
            if (activeTab === 'home') {
                sessionStorage.removeItem(LAWYER_DASHBOARD_TAB_KEY);
            } else {
                sessionStorage.setItem(LAWYER_DASHBOARD_TAB_KEY, activeTab);
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
                if (showCommunityRef.current || openInFlightRef.current) return;
                openInFlightRef.current = true;
                try {
                    dismissTransientOverlays('forum');
                    clearForumPerfMarks();
                    markForumPerfPhase('open-request');
                    warmForumOnOpen(userId);
                    primeCommunityShellMount();

                    flushSync(() => {
                        setShowCommunity(true);
                        showCommunityRef.current = true;
                    });

                    void loadCommunityScreenModule()
                        .catch(() => undefined)
                        .then(() => markForumPerfPhase('chunk-ready'));
                    void hydrateCommunityShellForInstantOpen(true).catch(() => undefined);
                    void readForumPostsCache().catch(() => undefined);
                } finally {
                    openInFlightRef.current = false;
                }
            },
        });
    }, [primeCommunityShellMount, userId]);

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
                openCommunityTab();
            }
        };
        syncCommunityHash();
        window.addEventListener('hashchange', syncCommunityHash);
        return () => window.removeEventListener('hashchange', syncCommunityHash);
    }, [openCommunityTab]);

    return {
        showCommunity,
        setShowCommunity,
        closeCommunity,
        handleCommunityBack: closeCommunity,
        communitySessionKey,
        primeCommunityShellMount,
        communityDeepLink,
        setCommunityDeepLink,
        resetCommunityScreen,
        resetCommunityShell,
        openCommunityTab,
    };
}
