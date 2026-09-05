import { useLayoutEffect } from 'react';
import { paintForumInstantChrome } from '@/app/runtime/forumInstantPaint';

/** غطاء Suspense — ثيم/طبقة المنتدى في DOM إن علّق Entry. */
export function ForumInstantPaintCover(): null {
    useLayoutEffect(() => {
        paintForumInstantChrome();
    }, []);
    return null;
}
