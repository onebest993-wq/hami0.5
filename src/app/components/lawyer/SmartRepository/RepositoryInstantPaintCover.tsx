import { useLayoutEffect } from 'react';
import { paintRepositoryInstantChrome } from '@/app/runtime/repositoryInstantPaint';

/**
 * غطاء Suspense — يعيد طلاء قشرة DOM إن علّق Entry. بلا تصميم جديد.
 */
export function RepositoryInstantPaintCover(): null {
    useLayoutEffect(() => {
        paintRepositoryInstantChrome();
    }, []);
    return null;
}
