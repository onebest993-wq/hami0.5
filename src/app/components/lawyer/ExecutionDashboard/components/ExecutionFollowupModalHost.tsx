import React, { useEffect } from 'react';

import { FollowupModalStoreProvider, type FollowupModalSnapshot } from '../followupModalContext';
import { ExecutionFollowupModalPortal } from '../ExecutionFollowupModalPortal';
import { prefetchExecutionFollowupTab } from '../executionFollowupTabPrefetch';
import { useExecutionDashboardStore } from '@/app/stores';

type ExecutionFollowupModalHostProps = {
    open: boolean;
    snapshot: FollowupModalSnapshot;
};

/**
 * محضر المتابعة — البوابة مضمّنة في ShellOverlays (لا lazy مزدوج).
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
    }, [open, tabToPrefetch]);

    if (!open) return null;

    return (
        <FollowupModalStoreProvider snapshot={snapshot}>
            <ExecutionFollowupModalPortal />
        </FollowupModalStoreProvider>
    );
}
