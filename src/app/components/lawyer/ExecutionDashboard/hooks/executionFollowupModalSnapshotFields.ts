import {
    EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS,
    type FollowupModalSnapshot,
} from '../followupSnapshotFieldKeys';

export function pickExecutionFollowupModalSnapshotFields(
    fields: Record<string, unknown>,
): FollowupModalSnapshot {
    const out: FollowupModalSnapshot = {};
    for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
        if (key in fields) {
            out[key] = fields[key];
        }
    }
    return out;
}

/** يزامن حقول محضر المتابعة في chunk scope — مصدر واحد لـ ExecutionFollowupModalHost */
export function assignExecutionFollowupModalSnapshotScope(
    target: Record<string, unknown>,
    sources: Record<string, unknown>,
): void {
    for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
        if (Object.prototype.hasOwnProperty.call(sources, key)) {
            target[key] = sources[key];
        }
    }
}
