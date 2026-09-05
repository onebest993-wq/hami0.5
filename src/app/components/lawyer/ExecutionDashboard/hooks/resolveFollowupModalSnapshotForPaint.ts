import type { FollowupModalSnapshot } from '../followupModalContext';
import { EMPTY_FOLLOWUP_MODAL_SNAPSHOT } from './emptyFollowupModalSnapshot';
import { peekFollowupModalSnapshotBuilder } from './followupModalSnapshotBuilderCache';

export { EMPTY_FOLLOWUP_MODAL_SNAPSHOT };

/** كيس 197 مفتاحاً يُبنى عند الفتح وفقط إذا اكتمل تسخين البنّاء — بلا enrich في نواة الإضبارة. */
export function resolveFollowupModalSnapshotForPaint(
    followupOpen: boolean,
    sources: FollowupModalSnapshot,
): FollowupModalSnapshot {
    if (!followupOpen) return EMPTY_FOLLOWUP_MODAL_SNAPSHOT;
    const build = peekFollowupModalSnapshotBuilder();
    if (!build) return EMPTY_FOLLOWUP_MODAL_SNAPSHOT;
    return build(sources);
}
