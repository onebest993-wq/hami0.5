import type { FollowupModalSnapshot } from './followupModalContext';

/** Shallow pass-through — keeps ExecutionDashboard call site generated and typed. */
export function buildFollowupModalSnapshot(snapshot: FollowupModalSnapshot): FollowupModalSnapshot {
    return snapshot;
}
