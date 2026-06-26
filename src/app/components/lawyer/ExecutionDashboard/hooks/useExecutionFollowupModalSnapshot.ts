import { useRef } from 'react';
import type { FollowupModalSnapshot } from '../followupModalContext';

const EMPTY_FOLLOWUP_SNAPSHOT: FollowupModalSnapshot = {};

/** يبني snapshot محضر المتابعة فقط عند الفتح — لا تكلفة عند الإغلاق */
export function useExecutionFollowupModalSnapshot(
    open: boolean,
    build: () => FollowupModalSnapshot,
): FollowupModalSnapshot {
    const buildRef = useRef(build);
    buildRef.current = build;
    if (!open) return EMPTY_FOLLOWUP_SNAPSHOT;
    return buildRef.current();
}
