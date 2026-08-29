import React, { Suspense } from 'react';
import type { FollowupModalSnapshot } from '../followupModalContext';
import { LazyExecutionFollowupModalHost } from '../executionFollowupHostLazy';
import { ExecutionFollowupInstantFrame } from './ExecutionFollowupInstantFrame';

/**
 * محضر المتابعة — مسار مستقل عن برميل ShellOverlays.
 * بعد التسخين يُرسم Host في نفس commit النقرة بلا وميض طبقة فارغة.
 */
export function ExecutionFollowupOverlayEntry({
    open,
    snapshot,
}: {
    open: boolean;
    snapshot: FollowupModalSnapshot;
}): React.ReactElement | null {
    if (!open) return null;

    if (LazyExecutionFollowupModalHost.isPreloaded()) {
        return <LazyExecutionFollowupModalHost open snapshot={snapshot} />;
    }

    return (
        <Suspense fallback={<ExecutionFollowupInstantFrame />}>
            <LazyExecutionFollowupModalHost open snapshot={snapshot} />
        </Suspense>
    );
}
