import type { Dispatch, SetStateAction } from 'react';
import type { CriminalDefendant, OurRepresentation, StageConclusion } from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import type { DecisionsPartyScope } from './juvenileInvestigationRules';
import {
    isDefendantBailTemplate,
    isInvestigationExpirationJudicialTemplate,
    isPrivateRightWaiverTemplate,
} from './proceduralRequestTypes';
import { validateDetentionDateRange } from './detentionEngine';
import { validateExpirationReasonSelection } from './stageExpirationReasons';
import type { ConfirmActionState } from './CriminalDashboardModalsHost';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';
import {
    buildCriminalRequestPayloadBase,
    type PartyBailDraftLike,
    type SeizureDraftLike,
} from './criminalRequestCommitPayloadBuilders';
import {
    commitCreateLawyerRequest,
    type DetentionDraftLike,
} from './criminalRequestCommitCreateHelpers';
import {
    commitFinalizeLawyerRequest,
    promptFatalRequestLockConfirm,
} from './criminalRequestCommitFinalizeHelpers';

type RequestPartyCtx = {
    isUnknownPerpetrator: boolean;
    isDefense: boolean;
    complainantsCount: number;
    defendantsCount: number;
};

type CommitFlowOrchestratorKeys =
    | 'reqDate' | 'reqNote' | 'reqTypeTemplate' | 'reqCustomTypeName' | 'reqIsAppealable'
    | 'reqDefendantIds' | 'reqLegalArticleBasis' | 'reqReferredCourtName' | 'reqStatus'
    | 'reqJudgeMargin' | 'reqDecisionDate' | 'reqIsStarred' | 'reqDraftAttachments'
    | 'reqBailByPartyId' | 'reqBailUnified' | 'reqDetentionByPartyId' | 'reqDetentionStartDate'
    | 'reqDetentionEndDate' | 'reqDetentionUnified' | 'reqSeizureSelectedDefendantIds'
    | 'reqSeizureDraftsByDefendant' | 'reqInvestigationExpirationReason'
    | 'reqInvestigationExpirationCustomDetail';

type CriminalRequestCommitFlowParams = Pick<CriminalRequestsOrchestratorSlice, CommitFlowOrchestratorKeys> & {
    id: string;
    showLegalToast: (message: string, durationMs?: number) => void;
    setConfirmAction: Dispatch<SetStateAction<ConfirmActionState | null>>;
    createLawyerRequest: (
        id: string,
        payload: Record<string, unknown>,
    ) => { error?: string; requestId?: string };
    finalizeLawyerRequest: (
        id: string,
        requestId: string,
        fields: { status: 'approved' | 'rejected'; judgeMargin: string; decisionDate: string },
    ) => string | undefined | void;
    issueStageDecision: (id: string, conclusion: StageConclusion) => string | undefined | void;
    toggleRequestStar: (id: string, requestId: string) => void;
    addRequestAttachment: (id: string, requestId: string, name: string) => void;
    closeRequestsModal: () => void;
    closeQuickFinalizeModal: () => void;
    submitQuickFinalizeController: (
        onPromptFatalLock: (status: 'approved' | 'rejected', onConfirm: () => void) => void,
        onCommitFinalize: (
            status: 'approved' | 'rejected',
            requestId: string,
            fields: { judgeMargin: string; decisionDate: string },
        ) => void,
    ) => void;
    defendants: CriminalDefendant[];
    ourRepresentation: OurRepresentation;
    isInvestigationPhase: boolean;
    // party-scope derived
    reqNeedsPurgeDefendantScope: boolean;
    autoRequestPartyId: string | null;
    requestEligibleParties: CriminalActionParty[];
    requestPartyCtx: RequestPartyCtx;
    requestDecisionsScope: DecisionsPartyScope | undefined;
    effectiveRequestPartyIds: string[];
    showRequestPartySection: boolean;
    // specialty-fields derived
    reqIsAssetSeizureEntry: boolean;
    reqIsDefendantBailEntry: boolean;
    bailTargetDefendantIds: string[];
    reqNeedsDetentionDateRange: boolean;
    detentionRangeValid: boolean;
    bailFormValid: boolean;
    // form-flags derived
    reqIsJudicialDecisionEntry: boolean;
    requestFormBaseValid: boolean;
    requestFormFinalValid: boolean;
    // controller-level state
    isRequestModalViewOnly: boolean;
    isRequestCreateMode: boolean;
    isRequestFinalStatus: boolean;
};

/**
 * تنفيذ الطلب: بناء حمولة الطلب، إنشاؤه (بما يشمل تفريع الكفالة/التوقيف على
 * عدّة أطراف عند عدم توحيدها)، إغلاقه النهائي بهامش القاضي (مع تسجيل قرار
 * الانقضاء التلقائي عند الحاجة)، وتقديم النموذج (مع رسائل التحقّق).
 */
export function useCriminalRequestCommitFlow(params: CriminalRequestCommitFlowParams) {
    const {
        id,
        showLegalToast,
        setConfirmAction,
        createLawyerRequest,
        finalizeLawyerRequest,
        issueStageDecision,
        toggleRequestStar,
        addRequestAttachment,
        closeRequestsModal,
        closeQuickFinalizeModal,
        submitQuickFinalizeController,
        reqDate,
        reqNote,
        reqTypeTemplate,
        reqCustomTypeName,
        reqIsAppealable,
        reqDefendantIds,
        reqLegalArticleBasis,
        reqReferredCourtName,
        reqStatus,
        reqJudgeMargin,
        reqDecisionDate,
        reqIsStarred,
        reqDraftAttachments,
        reqBailByPartyId,
        reqBailUnified,
        reqDetentionByPartyId,
        reqDetentionStartDate,
        reqDetentionEndDate,
        reqDetentionUnified,
        reqSeizureSelectedDefendantIds,
        reqSeizureDraftsByDefendant,
        reqInvestigationExpirationReason,
        reqInvestigationExpirationCustomDetail,
        defendants,
        ourRepresentation,
        isInvestigationPhase,
        reqNeedsPurgeDefendantScope,
        autoRequestPartyId,
        requestEligibleParties,
        requestPartyCtx,
        requestDecisionsScope,
        effectiveRequestPartyIds,
        showRequestPartySection,
        reqIsAssetSeizureEntry,
        reqIsDefendantBailEntry,
        bailTargetDefendantIds,
        reqNeedsDetentionDateRange,
        detentionRangeValid,
        bailFormValid,
        reqIsJudicialDecisionEntry,
        requestFormBaseValid,
        requestFormFinalValid,
        isRequestModalViewOnly,
        isRequestCreateMode,
        isRequestFinalStatus,
    } = params;

    const syncRequestUxAfterCreate = (requestId: string) => {
        if (reqIsStarred) toggleRequestStar(id, requestId);
        reqDraftAttachments.forEach((att) => {
            if (att.name.trim()) addRequestAttachment(id, requestId, att.name.trim());
        });
    };

    const buildRequestPayloadBase = () =>
        buildCriminalRequestPayloadBase({
            reqDefendantIds,
            reqNeedsPurgeDefendantScope,
            defendants,
            reqTypeTemplate,
            autoRequestPartyId,
            requestEligibleParties,
            ourRepresentation,
            requestPartyCtx,
            requestDecisionsScope,
            reqCustomTypeName,
            reqIsAppealable,
            reqDate,
            reqNote,
        });

    const commitCreateRequest = (opts?: { silent?: boolean }) =>
        commitCreateLawyerRequest(
            {
                id,
                showLegalToast,
                createLawyerRequest,
                syncRequestUxAfterCreate,
                reqDefendantIds,
                reqNeedsPurgeDefendantScope,
                defendants,
                reqTypeTemplate,
                autoRequestPartyId,
                requestEligibleParties,
                ourRepresentation,
                requestPartyCtx,
                requestDecisionsScope,
                reqCustomTypeName,
                reqIsAppealable,
                reqDate,
                reqNote,
                reqLegalArticleBasis,
                reqReferredCourtName,
                reqBailByPartyId: reqBailByPartyId as Record<string, PartyBailDraftLike | undefined>,
                reqBailUnified,
                reqDetentionByPartyId: reqDetentionByPartyId as Record<
                    string,
                    DetentionDraftLike | undefined
                >,
                reqDetentionStartDate,
                reqDetentionEndDate,
                reqDetentionUnified,
                reqSeizureSelectedDefendantIds,
                reqSeizureDraftsByDefendant: reqSeizureDraftsByDefendant as Record<
                    string,
                    SeizureDraftLike[] | undefined
                >,
                reqIsAssetSeizureEntry,
                reqIsDefendantBailEntry,
                bailTargetDefendantIds,
                reqNeedsDetentionDateRange,
                effectiveRequestPartyIds,
            },
            opts,
        );

    const commitFinalizeRequest = (
        status: 'approved' | 'rejected',
        requestId: string,
        fields?: { judgeMargin: string; decisionDate: string },
    ) => {
        commitFinalizeLawyerRequest(
            {
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
            },
            status,
            requestId,
            fields,
        );
    };

    const promptFatalRequestLock = (
        status: 'approved' | 'rejected',
        onConfirm: () => void,
    ) => {
        promptFatalRequestLockConfirm(setConfirmAction, status, onConfirm);
    };

    const submitRequest = () => {
        if (isRequestModalViewOnly) return;
        if (!requestFormBaseValid) {
            if (
                showRequestPartySection &&
                !isDefendantBailTemplate(reqTypeTemplate) &&
                effectiveRequestPartyIds.length === 0
            ) {
                showLegalToast('حدّد شخصاً واحداً على الأقل معنياً بالقرار.', 5000);
            } else if (reqIsDefendantBailEntry && bailTargetDefendantIds.length === 0) {
                showLegalToast('اختر متهماً واحداً على الأقل لقرار التكفيل.', 5000);
            } else if (reqIsDefendantBailEntry && !bailFormValid) {
                showLegalToast('أكمل تفاصيل الكفالة لكل متهم مُؤشَّر.', 5000);
            } else if (reqNeedsDetentionDateRange && !detentionRangeValid) {
                const firstInvalid = effectiveRequestPartyIds.find((partyId) => {
                    const draft = reqDetentionByPartyId[partyId] ?? {
                        startDate: reqDetentionStartDate,
                        endDate: reqDetentionEndDate,
                    };
                    return validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) !== null;
                });
                const draft = firstInvalid
                    ? (reqDetentionByPartyId[firstInvalid] ?? {
                          startDate: reqDetentionStartDate,
                          endDate: reqDetentionEndDate,
                      })
                    : { startDate: '', endDate: '' };
                const detentionErr =
                    validateDetentionDateRange(draft.startDate.trim(), draft.endDate.trim()) ||
                    'أدخل تاريخ بدء وانتهاء التوقيف لكل متهم مُؤشَّر.';
                showLegalToast(detentionErr, 5000);
            } else if (!reqNote.trim()) {
                showLegalToast(
                    reqIsJudicialDecisionEntry ? 'أدخل تفاصيل / وقائع القرار.' : 'أدخل تفاصيل الطلب.',
                    5000,
                );
            }
            return;
        }

        if (reqIsJudicialDecisionEntry) {
            if (
                isInvestigationPhase &&
                isInvestigationExpirationJudicialTemplate(reqTypeTemplate)
            ) {
                const expirationErr = validateExpirationReasonSelection(
                    reqInvestigationExpirationReason,
                    reqInvestigationExpirationCustomDetail,
                );
                if (expirationErr || !reqDefendantIds.length) {
                    showLegalToast(expirationErr || 'حدّد متهماً واحداً على الأقل.', 5000);
                    return;
                }
            }
            if (isPrivateRightWaiverTemplate(reqTypeTemplate)) {
                setConfirmAction({
                    title: 'تأكيد صلح/تنازل',
                    message:
                        'هل أنت متأكد من توثيق قرار الصلح والتنازل؟ يُشمَع الإضبارة ويُسقَط الحق الشخصي وفق هذا القرار.',
                    confirmText: 'توثيق القرار',
                    cancelText: 'مراجعة',
                    onConfirm: () => {
                        if (isRequestCreateMode) {
                            const requestId = commitCreateRequest();
                            if (requestId) closeRequestsModal();
                        }
                    },
                });
                return;
            }
            if (isRequestCreateMode) {
                const requestId = commitCreateRequest();
                if (requestId) closeRequestsModal();
            }
            return;
        }

        if (!isRequestFinalStatus) {
            if (isRequestCreateMode) {
                const requestId = commitCreateRequest();
                if (requestId) closeRequestsModal();
            }
            return;
        }

        if (!requestFormFinalValid) return;

        if (reqStatus !== 'approved' && reqStatus !== 'rejected') return;
        const status = reqStatus;
        promptFatalRequestLock(status, () => {
            const requestId = commitCreateRequest({ silent: true });
            if (!requestId) return;
            commitFinalizeRequest(status, requestId);
        });
    };

    const submitQuickFinalize = () => {
        submitQuickFinalizeController(promptFatalRequestLock, commitFinalizeRequest);
    };

    return {
        syncRequestUxAfterCreate,
        buildRequestPayloadBase,
        commitCreateRequest,
        commitFinalizeRequest,
        promptFatalRequestLock,
        submitRequest,
        submitQuickFinalize,
    };
}
