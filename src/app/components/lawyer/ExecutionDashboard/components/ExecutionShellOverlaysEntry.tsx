import React, { Suspense } from 'react';
import { LazyExecutionDashboardShellOverlays } from '../executionDashboardShellOverlaysLazy';
import { ExecutionShellOverlayInstantPaint } from './ExecutionShellOverlayInstantPaint';

/**
 * برميل نوافذ الإضبارة — يُركَّب فقط عند نية نافذة.
 * انتظار البرميل هيكل فوري يعمل، لا فراغ كحلي.
 */
export function ExecutionShellOverlaysEntry({
    open,
    showUnifiedExecutionModal,
    unifiedModalTab,
    scope,
    followupSnapshot,
}: {
    open: boolean;
    showUnifiedExecutionModal: boolean;
    unifiedModalTab?: string | null;
    scope: Record<string, unknown>;
    followupSnapshot: Record<string, unknown>;
}): React.ReactElement | null {
    if (!open) return null;

    const live = (
        <LazyExecutionDashboardShellOverlays
            showUnifiedExecutionModal={showUnifiedExecutionModal}
            unifiedModalTab={unifiedModalTab ?? null}
            scope={scope}
            followupSnapshot={followupSnapshot}
        />
    );

    if (LazyExecutionDashboardShellOverlays.isPreloaded()) {
        return live;
    }

    return (
        <Suspense fallback={<ExecutionShellOverlayInstantPaint scope={scope} />}>{live}</Suspense>
    );
}
