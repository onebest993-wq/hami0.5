import React, { Suspense, useEffect } from 'react';

import { FollowupModalStoreProvider, type FollowupModalSnapshot } from '../followupModalContext';
import { EMPTY_FOLLOWUP_MODAL_SNAPSHOT } from '../hooks/emptyFollowupModalSnapshot';
import { LazyExecutionFollowupModalPortal } from '../executionFollowupModalLazy';
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
export function ExecutionFollowupModalHost({ open: openFromProp, snapshot }: ExecutionFollowupModalHostProps) {
    const storeOpen = useExecutionDashboardStore((s) => s.modals.showUnifiedExecutionModal);
    const open = storeOpen || openFromProp;

    const tabToPrefetch =
        typeof snapshot.unifiedModalTab === 'string' && snapshot.unifiedModalTab.length > 0
            ? String(snapshot.unifiedModalTab)
            : '';

    useEffect(() => {
        if (!open || !tabToPrefetch) return;
        prefetchExecutionFollowupTab(tabToPrefetch);
    }, [open, tabToPrefetch]);

    if (!open) return null;

    const dossierKey = String(snapshot.decisionsStorageExecutionId || '').trim();
    const snapshotReady = snapshot !== EMPTY_FOLLOWUP_MODAL_SNAPSHOT;
    const portal = !snapshotReady ? (
        <ExecutionFollowupInstantFrame />
    ) : LazyExecutionFollowupModalPortal.isPreloaded() ? (
        <LazyExecutionFollowupModalPortal />
    ) : (
        <Suspense fallback={<ExecutionFollowupInstantFrame />}>
            <LazyExecutionFollowupModalPortal />
        </Suspense>
    );

    return (
        <FollowupModalStoreProvider key={dossierKey || 'followup-open'} snapshot={snapshot}>
            {portal}
        </FollowupModalStoreProvider>
    );
}
