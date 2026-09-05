import React, { Suspense } from 'react';
import type { FollowupModalSnapshot } from '../followupModalContext';
import { LazyExecutionFollowupModalHost } from '../executionFollowupHostLazy';
import { useExecutionFollowupModalSnapshot } from '../hooks/useExecutionFollowupModalSnapshot';
import { ExecutionFollowupInstantFrame } from './ExecutionFollowupInstantFrame';

/**
 * محضر المتابعة — مسار مستقل عن برميل ShellOverlays.
 * بعد التسخين يُرسم Host في نفس commit النقرة بلا وميض طبقة فارغة.
 * الهوية تُثبَّت عبر useExecutionFollowupModalSnapshot حتى لا يُعاد رسم التبويب
 * الحي كلما بُني كائن snapshot جديد بنفس القيم.
 */
export function ExecutionFollowupOverlayEntry({
    open,
    snapshot,
}: {
    open: boolean;
    snapshot: FollowupModalSnapshot;
}): React.ReactElement | null {
    const stableSnapshot = useExecutionFollowupModalSnapshot(open, () => snapshot);
    if (!open) return null;

    if (LazyExecutionFollowupModalHost.isPreloaded()) {
        return <LazyExecutionFollowupModalHost open snapshot={stableSnapshot} />;
    }

    return (
        <Suspense fallback={<ExecutionFollowupInstantFrame />}>
            <LazyExecutionFollowupModalHost open snapshot={stableSnapshot} />
        </Suspense>
    );
}
