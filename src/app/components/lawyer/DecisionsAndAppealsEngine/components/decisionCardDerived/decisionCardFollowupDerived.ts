import { inferExecutorApprovalDecisionType } from '@/app/utils/executorApprovalWorkflow';
import { isPersonalStatusCourtDecisionsDossier } from '@/app/utils/followupSpecializationVisibility';
import { isCreditorPartyRequest } from '../../utils';
import type { Decision } from '../../types';
import type { DecisionsDispatcherHubProps } from '../../engine/decisionsEngineTypes';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { isDecisionEffectivelyApproved } from './decisionCardEffectivelyApproved';

type DeriveDecisionCardFollowupParams = {
    decision: Decision;
    decisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    dispatcherHub?: DecisionsDispatcherHubProps;
    appealPerspective: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    requestFlowContinues: boolean;
};

/**
 * اختصارات المتابعة على بطاقة القرار.
 * إكمال/سير عمل الحجز أُزيل — الطلبات تُبتّ في المركز دون فتح نماذج إكمال.
 */
export function deriveDecisionCardFollowupShortcuts({
    decision,
    decisions,
    decisionsHubTab,
    dispatcherHub,
    appealPerspective,
    requestNeedsExecutorOutcome,
    requestFlowContinues,
}: DeriveDecisionCardFollowupParams) {
    const effectivelyApproved = (d: Decision) =>
        isDecisionEffectivelyApproved(
            d,
            decisions,
            decisionsHubTab,
            requestNeedsExecutorOutcome,
            appealPerspective,
        );

    const creditorPartyRequest = isCreditorPartyRequest(decision, appealPerspective);
    const showCreditorFollowupActions =
        appealPerspective !== 'debtor_agent' || !creditorPartyRequest;

    const executionFile = dispatcherHub?.executionData;
    const personalStatusCourtCoerciveBlocked = isPersonalStatusCourtDecisionsDossier(
        executionFile?.docType,
        executionFile?.classification,
        (executionFile as { category?: string } | undefined)?.category,
    );

    const evictionWorkflowBranch =
        decision.requestKind === 'eviction_procedure' &&
        effectivelyApproved(decision) &&
        requestFlowContinues &&
        !requestNeedsExecutorOutcome(decision)
            ? inferExecutorApprovalDecisionType(decision)
            : 'other';
    const evictionScheduleReady =
        evictionWorkflowBranch === 'Field Visit Date' && !String(decision.executorScheduleLabel || '').trim();
    const evictionGraceReady =
        evictionWorkflowBranch === 'Grace Period' && !String(decision.evictionGraceSavedAt || '').trim();
    const evictionPoliceReady =
        evictionWorkflowBranch === 'Police Assistance Request' &&
        !String(decision.policeAssistanceSavedAt || '').trim();
    const trustDisburseShortcutReady =
        decision.requestKind === 'trust_disburse' &&
        effectivelyApproved(decision) &&
        requestFlowContinues &&
        !requestNeedsExecutorOutcome(decision);
    const guarantorDetailsAlreadySaved =
        Boolean(String((decision as { guarantorDetailsSavedAt?: string }).guarantorDetailsSavedAt || '').trim()) ||
        Boolean(
            (dispatcherHub as { executionData?: { guarantor_followup?: { details_saved?: boolean } } } | undefined)
                ?.executionData?.guarantor_followup?.details_saved,
        );
    const guarantorShortcutReady =
        decision.requestKind === 'guarantor_request' &&
        effectivelyApproved(decision) &&
        requestFlowContinues &&
        !guarantorDetailsAlreadySaved &&
        !requestNeedsExecutorOutcome(decision);

    return {
        showCreditorFollowupActions,
        personalStatusCourtCoerciveBlocked,
        evictionScheduleReady,
        evictionGraceReady,
        evictionPoliceReady,
        trustDisburseShortcutReady,
        guarantorShortcutReady,
    };
}
