import { EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS } from '../followupSnapshotFieldKeys';

/** ينقل حقول محضر المتابعة من مصدر الـ hook إلى chunk scope — يملأ الفجوات دون تكرار القائمة اليدوية */
export function pickExecutionFollowupScopeSlice(
    bag: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of EXECUTION_FOLLOWUP_MODAL_SNAPSHOT_FIELD_KEYS) {
        if (Object.prototype.hasOwnProperty.call(bag, key)) {
            out[key] = bag[key];
        }
    }
    return out;
}
