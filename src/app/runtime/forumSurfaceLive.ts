/** حياة سطح المنتدى — ورقة بلا طلاء فوري حتى لا تسحب الخلاصة forumInstantPaint */

let forumSurfaceLive = false;
const forumSurfaceLiveListeners = new Set<() => void>();

export function setForumSurfaceLive(live: boolean): void {
    if (forumSurfaceLive === live) return;
    forumSurfaceLive = live;
    for (const listener of forumSurfaceLiveListeners) listener();
}

export function isForumSurfaceLive(): boolean {
    return forumSurfaceLive;
}

export function subscribeForumSurfaceLive(onChange: () => void): () => void {
    forumSurfaceLiveListeners.add(onChange);
    return () => {
        forumSurfaceLiveListeners.delete(onChange);
    };
}

export function resetForumSurfaceLiveForTests(): void {
    forumSurfaceLive = false;
    forumSurfaceLiveListeners.clear();
}
