import type { ExecutionDecisionHubStatus } from '@/app/types/execution';
import type { Decision } from '../../types';
import {
    appealCreditorRequestPauseGateMessage,
    appealCreditorRequestRevokedGateMessage,
    isAppealResultFavorableToDebtorClient,
    type AppealUiPerspective,
} from '../../appealUiLabels';
import { resolveUnderlyingDecisionHub } from '../decisionGraphUtils';
import {
    hubWithInferredAppealOrigin,
    inferDecisionAppealRequestOrigin,
    isCreditorInitiatedExecutorRequest,
    isCreditorExecutorAppealSubject,
    isCreditorPartyRequest,
    isDecisionLikeRow,
    resolveRequestFilerFromDebtorAgentView,
    resolveRequestProponent,
} from '../appealRequestOrigin';
import {
    isManualExecutorLedgerDecision,
    isAppealDeadlinePerpetuallyEnforced,
} from './manualExecutorIdentity';
import { resolveManualExecutorLedgerEnforcementState } from './manualExecutorLedger';
import {
    appealPipelineRowForCard,
    effectiveExecutorOutcomeForCreditorHubPill,
    isLawyerCassationNaqdResume,
    isLawyerCassationRadReset,
} from './decisionHubPipeline';
import {
    resolveEffectiveAwaitingCassationParty,
    resolveEffectiveAppealActor,
    isCassationAffirmResult,
} from './appealProceedings';
import {
    resolveGrievanceFilerActor,
    resolveCassationFilerActor,
    isDebtorAppealEligibleApprovedHub,
    resolveAppealBaseBranch,
} from './appealWorkflowActors';
import type {
    CreditorRequestAppealGate,
    CreditorDecisionEnforcementState,
    DecisionHubStatusPillTone,
    ExecutorRequestFollowupBlock,
} from './appealTypes';

export function buildWaiveCassationAfterDebtorGrievancePatch(d: Decision): Partial<Decision> {
    return {
        noAppealChosen: true,
        appealStatus: 'final',
        appealPhase: null,
        appealWorkflowState: 'FINAL_REJECTED',
        appealResult: 'قبول التظلم',
        executorOutcome: 'rejected',
        status: 'rejected',
        awaitingCassationEntryBy: null,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        grievanceRejectedAwaitingTamyeez: false,
        appealMethod: 'tadhallum',
    };
}

/** هل يُسمح بالاستغناء عن التمييز بعد قبول تظلم المدين على طلب الدائن الموافق عليه */
export function canWaiveCassationAfterDebtorGrievance(hub: Decision, all: Decision[]): boolean {
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipe = appealPipelineRowForCard(hubRow, all);
    if (pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation') return false;
    if (pipe.appealStatus === 'final' || hubRow.appealStatus === 'final') return false;
    const awaiting =
        pipe.awaitingCassationEntryBy === 'lawyer' || hubRow.awaitingCassationEntryBy === 'lawyer';
    if (!awaiting) return false;
    const result = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    if (result !== 'قبول التظلم') return false;
    if (!isDebtorAppealEligibleApprovedHub(hubRow, 'creditor_agent')) return false;
    const phys = hubRow.executorOutcome;
    return phys === 'approved' || phys === 'alternative';
}

/** استغناء وكيل الدائن عن التمييز بعد رد التظلم وقبل تسجيله */
export function canWaiveLawyerCassationAfterGrievanceRejected(hub: Decision, all: Decision[]): boolean {
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipe = appealPipelineRowForCard(hubRow, all);
    if (pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation') return false;
    if (pipe.appealStatus === 'final' || hubRow.appealStatus === 'final') return false;
    if (pipe.noAppealChosen === true || hubRow.noAppealChosen === true) return false;
    const awaiting =
        pipe.awaitingCassationEntryBy === 'lawyer' || hubRow.awaitingCassationEntryBy === 'lawyer';
    if (!awaiting) return false;
    const result = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    if (result !== 'رد التظلم') return false;
    if (!(pipe.grievanceRejectedAwaitingTamyeez || hubRow.grievanceRejectedAwaitingTamyeez)) {
        return false;
    }
    return (pipe.appealActor ?? hubRow.appealActor) === 'lawyer';
}

/** أي حالة يحقّ فيها لوكيل الدائن الاستغناء عن خطوة التمييز المتبقية */
export function canWaiveLawyerAwaitingCassation(hub: Decision, all: Decision[]): boolean {
    return (
        canWaiveCassationAfterDebtorGrievance(hub, all) ||
        canWaiveLawyerCassationAfterGrievanceRejected(hub, all)
    );
}

/** سبب رفض «لا حاجة للتمييز» — رسالة واضحة بدل العبارة العامة */
export function resolveWaiveCassationBlockedReason(hub: Decision, all: Decision[]): string {
    const hubRow = hubWithInferredAppealOrigin(hub);
    const pipe = appealPipelineRowForCard(hubRow, all);

    if (pipe.appealStatus === 'tamyeez_filed' || pipe.appealPhase === 'cassation') {
        return 'سُجّل تمييز على القرار — لا يمكن الاستغناء بعد تقديم اللائحة.';
    }
    if (pipe.appealStatus === 'final' || hubRow.appealStatus === 'final') {
        return 'مسار الطعن مُختوم — لا إجراء إضافي مطلوب.';
    }

    const result = String(pipe.appealResult ?? hubRow.appealResult ?? '').trim();
    if (result !== 'قبول التظلم' && result !== 'رد التظلم') {
        return 'بانتظار نتيجة التظلم — لا يمكن الاستغناء قبل صدورها من المحكمة.';
    }

    if (result === 'قبول التظلم') {
        if (!isDebtorAppealEligibleApprovedHub(hubRow, 'creditor_agent')) {
            return 'هذا الطلب لا يدخل مسار استغناء الدائن عن التمييز.';
        }
        const awaiting =
            pipe.awaitingCassationEntryBy === 'lawyer' || hubRow.awaitingCassationEntryBy === 'lawyer';
        if (!awaiting) {
            return 'التمييز بانتظار الطرف الآخر — لا يحقّ لوكيل الدائن الاستغناء الآن.';
        }
        return 'لا يمكن إتمام الاستغناء عن التمييز في هذه الحالة.';
    }

    if (!(pipe.grievanceRejectedAwaitingTamyeez || hubRow.grievanceRejectedAwaitingTamyeez)) {
        return 'لم يُفتح مهلة تمييز بعد رد التظلم بعد.';
    }
    if ((pipe.appealActor ?? hubRow.appealActor) !== 'lawyer') {
        return 'الاستغناء متاح فقط بعد تظلم وكيل الدائن على الرفض.';
    }
    return 'لا يمكن إتمام الاستغناء عن التمييز في هذه الحالة.';
}

export function buildWaiveLawyerCassationAfterGrievanceRejectedPatch(d: Decision): Partial<Decision> {
    const branch = resolveAppealBaseBranch(d);
    return {
        noAppealChosen: true,
        appealStatus: 'final',
        appealPhase: null,
        appealWorkflowState: branch === 'after_rejection' ? 'FINAL_REJECTED' : 'FINAL_ACCEPTED',
        awaitingCassationEntryBy: null,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        grievanceRejectedAwaitingTamyeez: false,
        appealMethod: 'tadhallum',
    };
}
