import { useRef } from 'react';
import type { FollowupModalSnapshot } from '../followupModalContext';
import { hasSelectedScopeDeltaForLazySync } from './executionDashboardCore/executionScopeLazySyncDelta';
import { hasFollowupModalStubHandlerUpgrade } from './followupModalSnapshotHydration';

const EMPTY_FOLLOWUP_SNAPSHOT: FollowupModalSnapshot = {};

/**
 * يبني snapshot محضر المتابعة فقط عند الفتح — لا تكلفة عند الإغلاق.
 * تثبيت الهوية: إعادة بناء الكائن كل render كانت تغيّر قيمة الـ context
 * فيُعاد رسم كل التبويبات المفتوحة (keep-alive) بلا أي تغيير فعلي — نعيد
 * المرجع السابق ما لم تتغير قيمة قابلة للمقارنة (نفس دلالات مزامنة الـ scope).
 */
export function useExecutionFollowupModalSnapshot(
    open: boolean,
    build: () => FollowupModalSnapshot,
): FollowupModalSnapshot {
    const buildRef = useRef(build);
    buildRef.current = build;
    const lastSnapshotRef = useRef<FollowupModalSnapshot | null>(null);
    if (!open) {
        lastSnapshotRef.current = null;
        return EMPTY_FOLLOWUP_SNAPSHOT;
    }
    const next = buildRef.current();
    const prev = lastSnapshotRef.current;
    if (
        prev &&
        !hasSelectedScopeDeltaForLazySync(prev, next) &&
        !hasFollowupModalStubHandlerUpgrade(prev, next)
    ) {
        return prev;
    }
    lastSnapshotRef.current = next;
    return next;
}
