import type { FollowupModalSnapshot } from '../followupModalContext';
import { enrichFollowupModalSnapshot } from './enrichFollowupModalSnapshot';
import { pickExecutionFollowupModalSnapshotFields } from './executionFollowupModalSnapshotFields';

export type FollowupModalSnapshotSources = FollowupModalSnapshot;

export function buildFollowupModalSnapshotInput(
    sources: FollowupModalSnapshotSources,
): FollowupModalSnapshot {
    const picked = pickExecutionFollowupModalSnapshotFields(sources);
    return enrichFollowupModalSnapshot(sources as Record<string, unknown>, picked);
}
