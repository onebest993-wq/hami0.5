import React, { Suspense, useEffect } from 'react';

import { FollowupModalStoreProvider, type FollowupModalSnapshot } from '../followupModalContext';
import { LazyExecutionFollowupModalPortal } from '../executionFollowupModalLazy';
import { prefetchExecutionCoreHandlers } from '../executionCoreHandlersPrefetch';
import { prefetchExecutionFollowupTab } from '../executionFollowupTabPrefetch';
import { useExecutionDashboardStore } from '@/app/stores';
import { ExecutionFollowupInstantFrame } from './ExecutionFollowupInstantFrame';

type ExecutionFollowupModalHostProps = {
    open: boolean;
    snapshot: FollowupModalSnapshot;
};

/**
 * محضر المتابعة — Host رفيع.
 * Suspense التبويب يبقى داخل اللوحة فقط بعد ظهور هيكل المحضر فوراً.
 */
export function ExecutionFollowupModalHost({ open: _openFromProp, snapshot }: ExecutionFollowupModalHostProps) {
    const open = useExecutionDashboardStore((s) => s.modals.showUnifiedExecutionModal);

    const tabToPrefetch =
        typeof snapshot.unifiedModalTab === 'string' && snapshot.unifiedModalTab.length > 0
            ? String(snapshot.unifiedModalTab)
            : 'seizure_requests';

    useEffect(() => {
        if (!open) return;
        prefetchExecutionFollowupTab(tabToPrefetch);
        prefetchExecutionFollowupTab('coercive');
        prefetchExecutionCoreHandlers('coercive');
        prefetchExecutionCoreHandlers('coercive-eviction');
        prefetchExecutionCoreHandlers('coercive-lifecycle');
    }, [open, tabToPrefetch]);

    if (!open) return null;

    const portal = LazyExecutionFollowupModalPortal.isPreloaded() ? (
        <LazyExecutionFollowupModalPortal />
    ) : (
        <Suspense fallback={<ExecutionFollowupInstantFrame />}>
            <LazyExecutionFollowupModalPortal />
        </Suspense>
    );

    return <FollowupModalStoreProvider snapshot={snapshot}>{portal}</FollowupModalStoreProvider>;
}
