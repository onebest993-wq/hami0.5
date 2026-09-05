import { useLayoutEffect } from 'react';
import { paintTransactionsInstantChrome } from '@/app/runtime/transactionsInstantPaint';

/** غطاء Suspense — يعيد طلاء قشرة DOM إن علّق Entry. بلا تصميم جديد. */
export function TransactionsInstantPaintCover(): null {
    useLayoutEffect(() => {
        paintTransactionsInstantChrome();
    }, []);
    return null;
}
