import { inferExecutorApprovalDecisionType } from '@/app/utils/executorApprovalWorkflow';
import { isPersonalStatusCourtDecisionsDossier } from '@/app/utils/followupSpecializationVisibility';
import { isSeizureDecisionFollowupComplete } from '../../seizureFollowupComplete';
import { isCreditorPartyRequest } from '../../utils';
import type { Decision } from '../../types';
import type { DecisionsDispatcherHubProps } from '../../engine/decisionsEngineTypes';
import type { AppealUiPerspective } from '../../appealUiLabels';
import { isDecisionEffectivelyApproved } from './decisionCardEffectivelyApproved';

function propertyStepFromSubtype(st: string):
    | 'init'
    | 'experts'
    | 'auction'
    | 'award'
    | 'reauction_default'
    | null {
    if (st === 'property') return 'init';
    if (st === 'property_expert') return 'experts';
    if (st === 'property_expert_committee') return 'experts';
    if (st === 'property_auction') return 'auction';
    if (st === 'property_final_award') return null;
    if (st === 'property_increase_10') return null;
    if (st === 'property_reauction_default') return 'reauction_default';
    return null;
}

function seizureCompletionLabelForSubtype(seizureSubtype: string): string {
    const step = propertyStepFromSubtype(seizureSubtype);
    if (step === 'init') return 'إكمال بيانات العقار';
    if (step === 'experts') return 'تسجيل تقرير الخبراء';
    if (step === 'auction') return 'تسجيل موعد المزايدة';
    if (step === 'award') return 'تسجيل الإحالة';
    if (step === 'reauction_default') return 'تسجيل النكول/إعادة المزايدة';
    if (seizureSubtype === 'movable_auction') return 'إكمال بيانات المال المنقول';
    if (seizureSubtype === 'movable_expert') return 'تسجيل تقرير الخبراء';
    if (seizureSubtype === 'movable_expert_committee') return 'تسجيل تقرير الخبراء';
    if (seizureSubtype === 'movable_auction_date') return 'تسجيل موعد المزايدة';
    if (seizureSubtype === 'movable_reauction_default') return 'تسجيل النكول/إعادة المزايدة';
    return 'إكمال بيانات الحجز';
}

const SEIZURE_SUBTYPE_FINAL_NO_COMPLETION = new Set([
    'movable_auction',
    'property_final_award',
    'property_expert_objection',
    'movable_expert_objection',
    'property_title_transfer',
    'property_buyer_delivery',
    'property_proceeds_disburse',
    'movable_final_award',
    'property_increase_10',
    'movable_increase_10',
    'movable_buyer_delivery',
    'movable_proceeds_disburse',
]);

type DeriveDecisionCardFollowupParams = {
    decision: Decision;
    decisions: Decision[];
    decisionsHubTab: 'current' | 'previous' | 'appeals' | 'archive';
    dispatcherHub?: DecisionsDispatcherHubProps;
    appealPerspective: AppealUiPerspective;
    requestNeedsExecutorOutcome: (d: Decision) => boolean;
    requestFlowContinues: boolean;
};

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

    const seizureSubtype = String(decision.seizureSubtype || '').trim();
    const executionFile = dispatcherHub?.executionData;
    const personalStatusCourtCoerciveBlocked = isPersonalStatusCourtDecisionsDossier(
        executionFile?.docType,
        executionFile?.classification,
        (executionFile as { category?: string } | undefined)?.category,
    );
    const seizureFollowupComplete = isSeizureDecisionFollowupComplete(decision, executionFile);
    const seizureCompletionReady =
        decision.requestKind === 'seizure' &&
        effectivelyApproved(decision) &&
        requestFlowContinues &&
        Boolean(seizureSubtype) &&
        !SEIZURE_SUBTYPE_FINAL_NO_COMPLETION.has(seizureSubtype) &&
        !seizureFollowupComplete &&
        !requestNeedsExecutorOutcome(decision);
    const seizureCompletionLabel = seizureCompletionLabelForSubtype(seizureSubtype);

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
        seizureCompletionReady,
        seizureCompletionLabel,
        seizureSubtype,
        evictionScheduleReady,
        evictionGraceReady,
        evictionPoliceReady,
        trustDisburseShortcutReady,
        guarantorShortcutReady,
    };
}

export { propertyStepFromSubtype };
