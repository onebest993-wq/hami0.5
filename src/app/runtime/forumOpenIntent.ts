/** نية فتح المنتدى من الإشعارات قبل تركيب جزيرة التنقّل / PreDock */

import { applyForumOpaqueChrome, paintForumInstantChrome } from '@/app/runtime/forumInstantPaint';
import { HAMI_OPEN_FORUM_EVENT } from '@/app/runtime/eventConstants';
import { resetForumSurfaceLiveForTests } from '@/app/runtime/forumSurfaceLive';
import { sanitizeNotificationEntityId } from '@/app/services/notifications/notificationNavigateSecurity';

export {
    isForumSurfaceLive,
    setForumSurfaceLive,
    subscribeForumSurfaceLive,
} from '@/app/runtime/forumSurfaceLive';
export const FORUM_OPEN_POST_SESSION_KEY = 'hami:forum-open-post-id';

let pendingOpen = false;

export function isForumOpenIntentPending(): boolean {
    return pendingOpen;
}

export function markForumOpenIntentPending(): void {
    pendingOpen = true;
}

export function clearForumOpenIntent(): void {
    pendingOpen = false;
}

export function resetForumOpenIntentForTests(): void {
    pendingOpen = false;
    resetForumSurfaceLiveForTests();
    if (typeof sessionStorage === 'undefined') return;
    try {
        sessionStorage.removeItem(FORUM_OPEN_POST_SESSION_KEY);
    } catch {
        /* ignore */
    }
}

export function consumeForumOpenPostId(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
        const raw = sessionStorage.getItem(FORUM_OPEN_POST_SESSION_KEY)?.trim() || '';
        sessionStorage.removeItem(FORUM_OPEN_POST_SESSION_KEY);
        return sanitizeNotificationEntityId(raw);
    } catch {
        return null;
    }
}

export function requestOpenLawyerForum(postId?: string): void {
    markForumOpenIntentPending();
    applyForumOpaqueChrome();
    paintForumInstantChrome();
    if (typeof window === 'undefined') return;

    const id = sanitizeNotificationEntityId(postId) ?? '';
    if (id) {
        try {
            sessionStorage.setItem(FORUM_OPEN_POST_SESSION_KEY, id);
        } catch {
            /* private mode / quota */
        }
    }

    window.dispatchEvent(new CustomEvent(HAMI_OPEN_FORUM_EVENT, { detail: { postId: id || undefined } }));
}

export function bindForumOpenIntent(open: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const onOpen = () => {
        open();
    };
    window.addEventListener(HAMI_OPEN_FORUM_EVENT, onOpen);
    return () => window.removeEventListener(HAMI_OPEN_FORUM_EVENT, onOpen);
}
