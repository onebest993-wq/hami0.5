/**
 * مصدر واحد لإشارات فروع التخلية الجبرية — موافقة الطعن، اكتمال المسار، وبوابة الإرسال.
 */
import type { EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import { EVICTION_TIMELINE_ACTION_IDS } from '@/app/utils/executionModuleStrategies';
import type { EvictionAppealSyncBranch, EvictionAppealSyncView } from '@/app/utils/evictionAppealSync';
import {
    getGoverningEvictionProcedureRowForBranch,
    isEvictionProcedureRowActive,
    isEvictionProcedureRowWorkflowComplete,
} from '@/app/utils/executorSeizureDecisionQueue';

export const EVICTION_ACTION_TO_APPEAL_BRANCH: Partial<
    Record<EvictionTimelineActionId, EvictionAppealSyncBranch>
> = {
    [EVICTION_TIMELINE_ACTION_IDS.FIELD_VISIT]: 'Field Visit Date',
    [EVICTION_TIMELINE_ACTION_IDS.POLICE_FORCE]: 'Police Assistance Request',
    [EVICTION_TIMELINE_ACTION_IDS.BREAK_INVENTORY]: 'Lock Breaking & Inventory',
    [EVICTION_TIMELINE_ACTION_IDS.CUSTODIAN]: 'Judicial Custodian',
    [EVICTION_TIMELINE_ACTION_IDS.RESIDENTIAL_GRACE_EARLY_END]: 'Residential Grace Early End',
};

export function getEvictionAppealBranchForActionId(
    actionId: EvictionTimelineActionId,
): EvictionAppealSyncBranch | null {
    return EVICTION_ACTION_TO_APPEAL_BRANCH[actionId] ?? null;
}

export function createEmptyEvictionAppealSyncView(branch: EvictionAppealSyncBranch): EvictionAppealSyncView {
    return {
        branch,
        governingRow: null,
        decisionId: null,
        gate: { kind: 'continue' },
        followupBlock: null,
        blocked: false,
        blocksFieldwork: false,
        blocksSubmit: false,
        cycleSuperseded: false,
        enforced: false,
        pillLabel: '',
        workflowComplete: false,
        decisionsNav: { decisionsTab: 'current' },
    };
}

export type EvictionBranchSubmitGuardResult = { ok: true } | { ok: false; message: string };

/** يطابق فحص submitEvictionRequest في لوحة الإجراءات الميدانية */
export function assertEvictionBranchSubmitAllowed(
    sync: EvictionAppealSyncView,
): EvictionBranchSubmitGuardResult {
    if (sync.blocksSubmit) {
        return {
            ok: false,
            message:
                sync.followupBlock?.message ??
                'لا يمكن إرسال طلب جديد — الطلب موقوف بسبب التظلم أو الطعن.',
        };
    }
    if (sync.blocked && sync.followupBlock?.kind !== 'lifecycle_reset') {
        return {
            ok: false,
            message:
                sync.followupBlock?.message ??
                'الإجراء موقوف — أكمل مسار الطعن من مركز القرارات.',
        };
    }
    return { ok: true };
}

export function resolveBreakInventoryWorkflowComplete(
    decisions: Record<string, unknown>[],
    syncWorkflowComplete: boolean,
): boolean {
    if (syncWorkflowComplete) return true;
    const row = getGoverningEvictionProcedureRowForBranch(decisions, 'Lock Breaking & Inventory');
    return Boolean(row && isEvictionProcedureRowWorkflowComplete(row));
}

/** نشاط جبري حديث عبر قرارات المنفذ (ليس السجل الزمني فقط) */
export function hasActiveEvictionProcedureDecisions(
    allDecisions: Record<string, unknown>[],
): boolean {
    if (!Array.isArray(allDecisions) || allDecisions.length === 0) return false;
    return allDecisions.some((row) => {
        if (String((row as { requestKind?: string }).requestKind || '') !== 'eviction_procedure') {
            return false;
        }
        return isEvictionProcedureRowActive(row, allDecisions);
    });
}
