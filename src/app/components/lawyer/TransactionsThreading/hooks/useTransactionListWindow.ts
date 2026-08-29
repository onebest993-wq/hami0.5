import { useCallback, useEffect, useRef, useState } from 'react';
import type { Transaction } from '@/app/modules/transactionsThreading/types';
import {
    TRANSACTION_LIST_RENDER_BATCH,
    resolveTransactionListLimit,
} from '@/app/components/lawyer/TransactionsThreading/utils/transactionListWindow';

export function useTransactionListWindow(
    items: readonly Transaction[],
    ensureId?: string | null,
) {
    const [requested, setRequested] = useState(TRANSACTION_LIST_RENDER_BATCH);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const total = items.length;
    const signature = `${items[0]?.id ?? ''}:${total}`;

    useEffect(() => {
        setRequested(TRANSACTION_LIST_RENDER_BATCH);
    }, [signature]);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') {
            setRequested(Number.POSITIVE_INFINITY);
        }
    }, []);

    const limit = resolveTransactionListLimit({
        total,
        requested,
        items,
        ensureId,
    });
    const visible = items.slice(0, limit);
    const hiddenCount = Math.max(0, total - visible.length);

    const expand = useCallback(() => {
        setRequested((current) =>
            Number.isFinite(current) ? current + TRANSACTION_LIST_RENDER_BATCH : current,
        );
    }, []);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node || hiddenCount <= 0 || typeof IntersectionObserver === 'undefined') return;
        const root =
            node.closest('[data-testid="transactions-list-scroll"]') ??
            node.closest('.hami-tx-overlay-layer');
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) expand();
            },
            { root: root instanceof Element ? root : null, rootMargin: '160px' },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [expand, hiddenCount, limit]);

    return { visible, hiddenCount, sentinelRef };
}
