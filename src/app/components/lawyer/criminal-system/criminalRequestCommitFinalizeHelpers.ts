import type { Dispatch, SetStateAction } from 'react';
import type { StageConclusion } from './criminalStore';
import { isInvestigationExpirationJudicialTemplate } from './proceduralRequestTypes';
import { buildRequestFatalLockMessage } from './lawyerRequestStatusMachine';
import type { ConfirmActionState } from './CriminalDashboardModalsHost';

export type CommitFinalizeLawyerRequestDeps = {
    id: string;
    showLegalToast: (message: string, durationMs?: number) => void;
    finalizeLawyerRequest: (
        id: string,
        requestId: string,
        fields: { status: 'approved' | 'rejected'; judgeMargin: string; decisionDate: string },
    ) => string | undefined | void;
    issueStageDecision: (id: string, conclusion: StageConclusion) => string | undefined | void;
    closeRequestsModal: () => void;
    closeQuickFinalizeModal: () => void;
    reqJudgeMargin: string;
    reqDecisionDate: string;
    reqTypeTemplate: string;
    reqInvestigationExpirationReason: StageConclusion['expirationReason'] | '' | null | undefined;
    reqInvestigationExpirationCustomDetail: string;
    reqDefendantIds: string[];
    reqNote: string;
    isInvestigationPhase: boolean;
};

export function buildInvestigationExpirationConclusion(input: {
    expirationReasonSnapshot: NonNullable<StageConclusion['expirationReason']>;
    expirationCustomSnapshot: string;
    reqNote: string;
    decisionDate: string;
    expirationDefendantIdsSnapshot: string[];
}): StageConclusion {
    const {
        expirationReasonSnapshot,
        expirationCustomSnapshot,
        reqNote,
        decisionDate,
        expirationDefendantIdsSnapshot,
    } = input;
    const expirationDetails =
        expirationReasonSnapshot === 'custom_manual'
            ? expirationCustomSnapshot.trim() || reqNote.trim() || 'انقضاء / سقوط الدعوى الجزائية'
            : reqNote.trim() || 'انقضاء / سقوط الدعوى الجزائية';
    return {
        id:
            globalThis.crypto && 'randomUUID' in globalThis.crypto
                ? globalThis.crypto.randomUUID()
                : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        stageType: 'investigation',
        decisionType: 'expiration',
        date: decisionDate || new Date().toISOString().slice(0, 10),
        details: expirationDetails,
        defendantStatusAtDecision: 'bailed',
        expirationReason: expirationReasonSnapshot,
        defendantIds: expirationDefendantIdsSnapshot,
    };
}

export function commitFinalizeLawyerRequest(
    deps: CommitFinalizeLawyerRequestDeps,
    status: 'approved' | 'rejected',
    requestId: string,
    fields?: { judgeMargin: string; decisionDate: string },
): void {
    const {
        id,
        showLegalToast,
        finalizeLawyerRequest,
        issueStageDecision,
        closeRequestsModal,
        closeQuickFinalizeModal,
        reqJudgeMargin,
        reqDecisionDate,
        reqTypeTemplate,
        reqInvestigationExpirationReason,
        reqInvestigationExpirationCustomDetail,
        reqDefendantIds,
        reqNote,
        isInvestigationPhase,
    } = deps;

    const judgeMargin = (fields?.judgeMargin ?? reqJudgeMargin).trim();
    const decisionDate = (fields?.decisionDate ?? reqDecisionDate).trim();
    const finalizedTemplate = reqTypeTemplate;
    const expirationReasonSnapshot = reqInvestigationExpirationReason;
    const expirationCustomSnapshot = reqInvestigationExpirationCustomDetail;
    const expirationDefendantIdsSnapshot = [...reqDefendantIds];
    const err = finalizeLawyerRequest(id, requestId, {
        status,
        judgeMargin,
        decisionDate,
    });
    if (err) {
        showLegalToast(err, 5000);
        return;
    }
    if (
        status === 'approved' &&
        isInvestigationPhase &&
        isInvestigationExpirationJudicialTemplate(finalizedTemplate) &&
        expirationReasonSnapshot &&
        expirationDefendantIdsSnapshot.length
    ) {
        const conclusion = buildInvestigationExpirationConclusion({
            expirationReasonSnapshot,
            expirationCustomSnapshot,
            reqNote,
            decisionDate,
            expirationDefendantIdsSnapshot,
        });
        const stageErr = issueStageDecision(id, conclusion);
        if (stageErr) {
            showLegalToast(stageErr, 5000);
            closeRequestsModal();
            closeQuickFinalizeModal();
            return;
        }
    }
    showLegalToast('تم تدوين هامش القاضي وقفل الطلب — أُدرج في سجل الطلب والقرار القضائي.', 5000);
    closeRequestsModal();
    closeQuickFinalizeModal();
}

export function promptFatalRequestLockConfirm(
    setConfirmAction: Dispatch<SetStateAction<ConfirmActionState | null>>,
    status: 'approved' | 'rejected',
    onConfirm: () => void,
): void {
    setConfirmAction({
        title: 'تأكيد الحفظ النهائي',
        message: buildRequestFatalLockMessage(status),
        confirmText: 'تأكيد الحفظ',
        cancelText: 'إلغاء',
        onConfirm,
    });
}
