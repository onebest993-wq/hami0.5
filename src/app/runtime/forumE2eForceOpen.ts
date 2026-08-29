/**
 * خطاف E2E لفتح المنتدى — stub قبل PreDock الكسول، ثم الخطاف الحي يستبدله.
 * عند cleanup الحي يُعاد الـ stub حتى لا تُفرَّغ النافذة بين الاختبارات.
 */

export type ForumE2eForceOpenWindow = Window & {
    __hamiE2eForceOpenCommunity?: () => void;
    __hamiE2eForceOpenCommunityStub?: () => void;
};

export function armForumE2eForceOpenStub(open: () => void): void {
    if (typeof window === 'undefined') return;
    const w = window as ForumE2eForceOpenWindow;
    w.__hamiE2eForceOpenCommunityStub = open;
    w.__hamiE2eForceOpenCommunity = open;
}

/** يُرجع منظّف يعيد تسليح الـ stub إن وُجد، وإلا يحذف الخطاف الحي فقط */
export function bindForumE2eForceOpenLive(open: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const w = window as ForumE2eForceOpenWindow;
    w.__hamiE2eForceOpenCommunity = open;
    return () => {
        const stub = w.__hamiE2eForceOpenCommunityStub;
        if (typeof stub === 'function') {
            w.__hamiE2eForceOpenCommunity = stub;
            return;
        }
        delete w.__hamiE2eForceOpenCommunity;
    };
}
