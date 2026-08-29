import type { MutableRefObject } from 'react';
import { flushSync } from 'react-dom';

import { dismissTransientOverlays } from '@/app/utils/bodyScrollLock';
import { ensureDeferredFeatureStylesLoaded } from '@/app/runtime/deferredFeatureStyles';
import { executeForumOverlayClose } from '@/app/runtime/overlaySnapClose';
import {
    applyForumOpaqueChrome,
    concealForumWarmShell,
    paintForumInstantChrome,
} from '@/app/runtime/forumInstantPaint';
import { clearForumOpenIntent } from '@/app/runtime/forumOpenIntent';
import {
    isCommunityOverlayEntryResolved,
    loadCommunityOverlayEntry,
    prefetchCommunityOverlayEntry,
} from '@/app/runtime/communityOverlayEntryLoader';
import {
    clearForumPerfMarks,
    markForumPerfPhase,
} from '@/app/services/forum/forumPerfMetrics';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { beginHubLayerExit, clearHubLayerClosing } from '@/app/runtime/overlayHubLayerMotion';
import { FORUM_HUB_LAYER } from '@/app/runtime/overlayHubLayerSpecs';
import { registerNativeBackHandler } from '@/app/runtime/nativeBackStack';
import {
    ensureCommunityScreenContentLoaded,
    loadCommunityScreenModule,
    loadForumIntentWarm,
    loadForumPostsWarmCache,
} from '@/app/hooks/lawyerDashboard/community/communityLazyImports';

export type CommitCommunityOpenParams = {
    userId: string | null;
    showCommunityRef: MutableRefObject<boolean>;
    setCommunityHostMounted: (mounted: boolean) => void;
    setShowCommunity: (open: boolean) => void;
    /** Host مركّب مسبقاً (keepAlive) — لا ننتظر مقطع Entry */
    hostAlreadyMounted?: boolean;
};

export type CommitCommunityCloseParams = {
    setShowCommunity: (open: boolean) => void;
    setCommunityDeepLink: (link: { postId?: string; openComments?: boolean } | null) => void;
    setCommunityHostMounted: (mounted: boolean) => void;
};

let forumOpenLoadSeq = 0;
let forumOpenInFlight = false;
const FORUM_OVERLAY_ENTRY_FAILSAFE_MS = 3_000;

export function isCommunityOpenInFlight(): boolean {
    return forumOpenInFlight;
}

export function resetCommunityOpenFlow(): void {
    forumOpenInFlight = false;
    forumOpenLoadSeq += 1;
}

/** للاختبارات — يصفّر حارس الفتح الجاري بعد إلغاء معلّق */
export function resetCommunityOpenFlowForTests(): void {
    resetCommunityOpenFlow();
}

function armForumOpenPendingDismiss(cancelled: { current: boolean }): () => void {
    if (typeof window === 'undefined') {
        return () => undefined;
    }

    let disarmed = false;
    const disarm = () => {
        if (disarmed) return;
        disarmed = true;
        window.removeEventListener('keydown', onKey, true);
        unregisterNativeBack();
    };

    const finish = () => {
        cancelled.current = true;
        forumOpenInFlight = false;
        clearForumOpenIntent();
        concealForumWarmShell();
        disarm();
    };

    const onKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        event.stopPropagation();
        finish();
    };

    window.addEventListener('keydown', onKey, true);
    const unregisterNativeBack = registerNativeBackHandler(() => {
        finish();
        return true;
    });

    return disarm;
}

/**
 * فتح المنتدى: ستارة html فوراً. إن كان Host/المقطع جاهزاً يُكشف في نفس النقرة.
 * أثناء انتظار المقطع: Escape/Cap يلغي الفتح (لا قشرة تحميل قابلة للنقر).
 */
export function commitCommunityOpen({
    userId,
    showCommunityRef,
    setCommunityHostMounted,
    setShowCommunity,
    hostAlreadyMounted = false,
}: CommitCommunityOpenParams): void {
    if (forumOpenInFlight) return;
    const wasClosing =
        typeof document !== 'undefined' &&
        document.documentElement.getAttribute(FORUM_HUB_LAYER.closingAttr) === '1';
    clearHubLayerClosing(FORUM_HUB_LAYER);
    if (showCommunityRef.current && hostAlreadyMounted) {
        if (wasClosing) paintForumInstantChrome();
        return;
    }

    clearForumPerfMarks();
    markForumPerfPhase('open-request');
    applyForumOpaqueChrome();
    paintForumInstantChrome();
    prefetchCommunityOverlayEntry();

    const reveal = () => {
        forumOpenInFlight = false;

        flushSync(() => {
            setCommunityHostMounted(true);
            setShowCommunity(true);
            showCommunityRef.current = true;
        });
        paintForumInstantChrome();
        clearForumOpenIntent();

        markForumPerfPhase('chunk-ready');
        queueMicrotask(() => dismissTransientOverlays('forum'));
        void ensureDeferredFeatureStylesLoaded();
        void loadForumIntentWarm().then((m) => m.warmForumOnOpen(userId));
        void ensureCommunityScreenContentLoaded().catch(() => undefined);
        void loadCommunityScreenModule().catch(() => undefined);
        void loadForumPostsWarmCache()
            .then((m) => m.readForumPostsCache())
            .catch(() => undefined);
    };

    const hostInDom =
        typeof document !== 'undefined' &&
        Boolean(document.querySelector('[data-testid="forum-overlay-host"]'));

    if (hostAlreadyMounted || hostInDom || isCommunityOverlayEntryResolved()) {
        reveal();
        return;
    }

    forumOpenInFlight = true;
    const seq = ++forumOpenLoadSeq;
    const cancelled = { current: false };
    const disarmPending = armForumOpenPendingDismiss(cancelled);
    let failSafeId = 0;
    let settled = false;
    const finishPending = (next: () => void) => {
        if (failSafeId) {
            window.clearTimeout(failSafeId);
            failSafeId = 0;
        }
        disarmPending();
        next();
    };
    const revealOnce = () => {
        if (settled || cancelled.current || seq !== forumOpenLoadSeq) return;
        settled = true;
        reveal();
    };

    failSafeId = window.setTimeout(() => {
        failSafeId = 0;
        finishPending(revealOnce);
    }, FORUM_OVERLAY_ENTRY_FAILSAFE_MS);

    void loadCommunityOverlayEntry()
        .then(() => {
            finishPending(revealOnce);
        })
        .catch(() => {
            /* المقطع لم يصل — أبقِ الستارة واكشف Host بدل طرد المستخدم للرئيسية */
            finishPending(revealOnce);
        });
}

export function commitCommunityClose({
    setShowCommunity,
    setCommunityDeepLink,
    setCommunityHostMounted,
}: CommitCommunityCloseParams): void {
    forumOpenInFlight = false;
    forumOpenLoadSeq += 1;
    clearForumOpenIntent();
    beginHubLayerExit(FORUM_HUB_LAYER, () => {
        executeForumOverlayClose({
            conceal: () => {
                if (typeof document !== 'undefined') {
                    const host = document.querySelector('[data-testid="forum-overlay-host"]');
                    blurFocusWithin(host instanceof HTMLElement ? host : null);
                }
                concealForumWarmShell();
            },
            commit: () => {
                flushSync(() => {
                    setShowCommunity(false);
                    setCommunityDeepLink(null);
                    setCommunityHostMounted(false);
                });
                if (typeof window !== 'undefined' && window.location.hash.includes('community/post/')) {
                    window.history.replaceState(
                        null,
                        '',
                        `${window.location.pathname}${window.location.search}`,
                    );
                }
            },
        });
    });
}
