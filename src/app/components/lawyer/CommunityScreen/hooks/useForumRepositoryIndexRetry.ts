import { useEffect } from 'react';

/** يعيد فهرسة المستندات المعلّقة طالما سطح المنتدى مفتوحاً — ليس عامل نظام في الخلفية. */
export function useForumRepositoryIndexRetry(enabled: boolean): void {
    useEffect(() => {
        if (!enabled) return;
        let cancelled = false;
        void import('@/app/services/forum/forumRepositoryIndexRetryWorker').then((m) => {
            if (cancelled) return;
            m.startForumRepositoryIndexRetryWorker();
        });
        return () => {
            cancelled = true;
            void import('@/app/services/forum/forumRepositoryIndexRetryWorker').then((m) => {
                m.stopForumRepositoryIndexRetryWorker();
            });
        };
    }, [enabled]);
}
