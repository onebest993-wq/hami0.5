import { useEffect, useRef } from 'react';
import { CommunityDB } from '@/app/services/forum/forumCommunityRuntime';
import {
    markForumPerfPhase,
    reportForumPerf,
} from '@/app/services/forum/forumPerfMetrics';
import { peekForumPostsCache } from '@/app/services/forum/forumPostsWarmCache';
import { sortCommunityPosts } from '@/app/services/cloud/lawyerCommunityCloud';

let forumOpenFlowSessionCounter = 0;
let lastActiveForumLifecycleId = 0;

export function useForumLifecycle(
    userId: string | null,
    loadingPosts: boolean,
    visiblePostCount: number,
    isOpen = true,
) {
    const hadLocalCacheRef = useRef(false);
    const markedThisOpenRef = useRef(false);
    const openSessionIdRef = useRef(0);
    const activeSessionIdRef = useRef(0);

    useEffect(() => {
        if (!isOpen) {
            markedThisOpenRef.current = false;
            hadLocalCacheRef.current = false;
            return;
        }

        forumOpenFlowSessionCounter += 1;
        openSessionIdRef.current += 1;
        const currentSessionId = openSessionIdRef.current;
        activeSessionIdRef.current = currentSessionId;
        lastActiveForumLifecycleId = currentSessionId;
        markedThisOpenRef.current = false;
        hadLocalCacheRef.current = false;

        const cached = peekForumPostsCache();
        if (cached && cached.length > 0) {
            if (activeSessionIdRef.current !== currentSessionId) return;
            hadLocalCacheRef.current = true;
        } else {
            let cancelled = false;
            void CommunityDB.listPosts()
                .then((rows) => {
                    if (cancelled) return;
                    if (activeSessionIdRef.current !== currentSessionId) return;
                    const local = sortCommunityPosts(rows).filter((p) => !p.groupId);
                    if (activeSessionIdRef.current !== currentSessionId) return;
                    hadLocalCacheRef.current = local.length > 0;
                })
                .catch(() => {
                    if (cancelled) return;
                    if (activeSessionIdRef.current !== currentSessionId) return;
                    return undefined;
                });
            return () => {
                cancelled = true;
                if (activeSessionIdRef.current === currentSessionId) {
                    activeSessionIdRef.current = 0;
                }
            };
        }
        return () => {
            if (activeSessionIdRef.current === currentSessionId) {
                activeSessionIdRef.current = 0;
            }
        };
    }, [isOpen]);

    const isShellReady = !loadingPosts || visiblePostCount > 0 || hadLocalCacheRef.current;

    useEffect(() => {
        if (!isOpen) {
            markedThisOpenRef.current = false;
            return;
        }
        if (activeSessionIdRef.current === 0) return;
        const currentSessionId = activeSessionIdRef.current;

        if (markedThisOpenRef.current) return;
        if (activeSessionIdRef.current !== currentSessionId) return;
        markedThisOpenRef.current = true;
        markForumPerfPhase('first-paint');
        markForumPerfPhase('interactive');
        reportForumPerf({
            userId: userId ?? undefined,
            postCount: visiblePostCount,
            hadLocalCache: hadLocalCacheRef.current,
        });

        void currentSessionId;
        /*
         * لا `tearDownForumFloatingState` هنا.
         *
         * تبعيّات هذا الأثر تشمل `visiblePostCount`، فتنظيفُه يعمل عند أوّل تغيّرٍ في
         * عدد المنشورات — أي عند **وصولها**. وكان يستدعي التفكيك، وهو يُخفي
         * `forum-overlay-host` وينزع `data-hami-forum-open`: فالطبقة تُغلق نفسها في
         * اللحظة التي تعرض فيها محتواها. قيس في E2E: فتحٌ عند ١٫١ث، ثم وصولُ البطاقات
         * وإغلاقُ الطبقة في الإطار نفسه عند ٢٣٫٣ث، بلا لمسةٍ من أحد.
         *
         * وهذا أثرُ قياسٍ لا مالكَ دورةِ حياة. والتفكيك مملوكٌ حيث يجب:
         * `commitCommunityClose` عند الإغلاق، و`LawyerDashboardCommunityOverlayEntry`
         * عند تفكيك المضيف، و`CommunityErrorBoundary` عند الانهيار،
         * و`resetLawyerSessionUiForIdentityChange` عند تبديل الهوية.
         *
         * دخل السطر في commit التجميع `065d18a2` بلا تعليل — كنظيره في مسار المستودع.
         */
        return () => {
            if (activeSessionIdRef.current === currentSessionId) {
                activeSessionIdRef.current = 0;
            }
        };
    }, [isOpen, userId, visiblePostCount]);

    return { isShellReady, hadLocalCache: hadLocalCacheRef.current };
}
