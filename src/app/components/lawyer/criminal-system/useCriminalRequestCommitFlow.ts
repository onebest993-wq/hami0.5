import type { Dispatch, SetStateAction } from 'react';
import type { CriminalDefendant, OurRepresentation, StageConclusion } from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import type { DecisionsPartyScope } from './juvenileInvestigationRules';
import { isDefendantBailTemplate, isInvestigationExpirationJudicialTemplate, isJudicialDecisionTemplate, isPrivateRightWaiverTemplate } from './proceduralRequestTypes';
import { resolveEffectiveDefendantScopeIds } from './partyPersonalStage';
import { resolveRequestPartyIdsForPayload } from './requestPartySelection';
import { resolveStoredRequestTypeFields } from './proceduralRequestTypes';
import { buildRequestFatalLockMessage } from './lawyerRequestStatusMachine';
import { emptyPartyBailDraft } from './components/concernedPartyDecisionPickerDraft';
import { validateDetentionDateRange } from './detentionEngine';
import { validateExpirationReasonSelection } from './stageExpirationReasons';
import type { ConfirmActionState } from './CriminalDashboardModalsHost';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';

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

export type CriminalRequestCommitFlowParams = Pick<CriminalRequestsOrchestratorSlice, CommitFlowOrchestratorKeys> & {
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

    const buildRequestPayloadBase = () => {
        const cleanedSelectedIds = Array.isArray(reqDefendantIds)
            ? reqDefendantIds.map((x) => String(x ?? '').trim()).filter((x) => x.length > 0)
            : [];
        const defendantIds = reqNeedsPurgeDefendantScope
            ? resolveEffectiveDefendantScopeIds(defendants, cleanedSelectedIds, reqTypeTemplate.trim())
            : (resolveRequestPartyIdsForPayload(
                    cleanedSelectedIds,
                    autoRequestPartyId,
                    requestEligibleParties,
                    reqTypeTemplate.trim(),
                    ourRepresentation,
                    requestPartyCtx,
                    requestDecisionsScope,
                ) ?? []);
        const resolved = resolveStoredRequestTypeFields(
            reqTypeTemplate.trim(),
            reqCustomTypeName.trim(),
            reqIsAppealable,
        );
        return {
            requestDate: reqDate.trim(),
            type: resolved.type,
            lawyerNote: reqNote.trim(),
            defendantIds: defendantIds.length ? defendantIds : undefined,
            proceduralTemplate: resolved.proceduralTemplate,
            isAppealable: resolved.isAppealable,
        };
    };

    const commitCreateRequest = (opts?: { silent?: boolean }) => {
        const buildDefendantBailPayload = (partyId: string) => {
            const draft = reqBailByPartyId[partyId] ?? emptyPartyBailDraft();
            if (draft.kind === 'financial') {
                const amt = draft.bailAmount.trim();
                if (!amt) return undefined;
                return { kind: 'financial' as const, bailAmount: amt };
            }
            if (draft.kind === 'personal') {
                const guarantors = draft.guarantors
                    .map((g) => ({
                        id: g.id,
                        fullName: String(g.fullName ?? '').trim(),
                    }))
                    .filter((g) => g.fullName.length > 0);
                if (!guarantors.length) return undefined;
                return { kind: 'personal' as const, guarantors };
            }
            return undefined;
        };

        /**
         * بيانات «حجز الأموال» — تُجمَّع لكل متهم هارب مُختار.
         * نُسقط الأصناف الفارغة (بدون وصف) قبل التمرير للمتجر.
         * نمرّر `id` مسوّدة محلّية ليُولّد المتجر معرّفاً نهائياً.
         */
        type AssetItemPayload = {
            description: string;
            referenceNumber?: string;
            seizureDate?: string;
            notes?: string;
        };
        type PerDefendantPayload = { defendantId: string; assets: AssetItemPayload[] };
        const assetSeizureInput = (() => {
            if (!reqIsAssetSeizureEntry) return undefined;
            const perDefendant = reqSeizureSelectedDefendantIds
                .map((did): PerDefendantPayload | null => {
                    const drafts = Array.isArray(reqSeizureDraftsByDefendant[did])
                        ? reqSeizureDraftsByDefendant[did]
                        : [];
                    const assets = drafts
                        .map((d): AssetItemPayload | null => {
                            const description = String(d?.description ?? '').trim();
                            if (!description) return null;
                            return {
                                description,
                                referenceNumber: String(d?.referenceNumber ?? '').trim() || undefined,
                                seizureDate: String(d?.seizureDate ?? '').trim() || undefined,
                                notes: String(d?.notes ?? '').trim() || undefined,
                            };
                        })
                        .filter((x): x is AssetItemPayload => x !== null);
                    if (!assets.length) return null;
                    return { defendantId: did, assets };
                })
                .filter((x): x is PerDefendantPayload => x !== null);
            return perDefendant.length ? { perDefendant } : undefined;
        })();

        /**
         * `defendantIds` لإجراء حجز الأموال = الهاربون المُختارون داخل المُحرِّر،
         * وليس قائمة `reqDefendantIds` الافتراضية (التي يُديرها party picker المغلق
         * لهذا القالب لأنّه يدير اختياره داخلياً).
         */
        const defendantIdsForPayload = reqIsAssetSeizureEntry
            ? reqSeizureSelectedDefendantIds.length > 0
                ? reqSeizureSelectedDefendantIds.slice()
                : undefined
            : reqIsDefendantBailEntry
              ? bailTargetDefendantIds.length
                  ? bailTargetDefendantIds.slice()
                  : buildRequestPayloadBase().defendantIds
              : buildRequestPayloadBase().defendantIds;

        const resolveDetentionDates = (partyId: string) => {
            const draft = reqDetentionByPartyId[partyId];
            return {
                start: (draft?.startDate ?? reqDetentionStartDate).trim() || undefined,
                end: (draft?.endDate ?? reqDetentionEndDate).trim() || undefined,
            };
        };

        const basePayload = {
            requestDate: reqDate.trim(),
            lawyerNote: reqNote.trim(),
            proceduralTemplate: reqTypeTemplate.trim(),
            customTypeName: reqCustomTypeName.trim(),
            isAppealable: reqIsAppealable,
            legalArticleBasis: reqLegalArticleBasis.trim() || undefined,
            referredCourtName: reqReferredCourtName.trim() || undefined,
            assetSeizure: assetSeizureInput,
        };

        const bailTargetIds = reqIsDefendantBailEntry
            ? bailTargetDefendantIds.length
                ? bailTargetDefendantIds
                : effectiveRequestPartyIds
            : [];

        if (reqIsDefendantBailEntry && bailTargetIds.length > 0) {
            if (reqBailUnified && bailTargetIds.length > 1) {
                const defendantBail = buildDefendantBailPayload(bailTargetIds[0]!);
                if (!defendantBail) {
                    showLegalToast('أكمل تفاصيل الكفالة لجميع المتهمين المُؤشَّرين.', 5000);
                    return null;
                }
                const { error, requestId } = createLawyerRequest(id, {
                    ...basePayload,
                    defendantIds: bailTargetIds.slice(),
                    defendantBail,
                });
                if (error) {
                    showLegalToast(error, 5000);
                    return null;
                }
                if (requestId) syncRequestUxAfterCreate(requestId);
                if (!opts?.silent) {
                    showLegalToast('✓ تم توثيق القرار في السجل.', 5000);
                }
                return requestId;
            }

            let lastRequestId: string | null = null;
            for (const partyId of bailTargetIds) {
                const defendantBail = buildDefendantBailPayload(partyId);
                if (!defendantBail) {
                    showLegalToast('أكمل تفاصيل الكفالة لكل متهم مُؤشَّر.', 5000);
                    return null;
                }
                const { error, requestId } = createLawyerRequest(id, {
                    ...basePayload,
                    defendantIds: [partyId],
                    defendantBail,
                });
                if (error) {
                    showLegalToast(error, 5000);
                    return null;
                }
                if (requestId) {
                    syncRequestUxAfterCreate(requestId);
                    lastRequestId = requestId;
                }
            }
            if (!opts?.silent) {
                showLegalToast('✓ تم توثيق القرار في السجل.', 5000);
            }
            return lastRequestId;
        }

        const detentionTargetIds =
            reqNeedsDetentionDateRange && Array.isArray(defendantIdsForPayload)
                ? defendantIdsForPayload
                : [];

        if (reqNeedsDetentionDateRange && detentionTargetIds.length > 1 && !reqDetentionUnified) {
            let lastRequestId: string | null = null;
            for (const partyId of detentionTargetIds) {
                const { start, end } = resolveDetentionDates(partyId);
                const { error, requestId } = createLawyerRequest(id, {
                    ...basePayload,
                    defendantIds: [partyId],
                    detentionStartDate: start,
                    detentionEndDate: end,
                });
                if (error) {
                    showLegalToast(error, 5000);
                    return null;
                }
                if (requestId) {
                    syncRequestUxAfterCreate(requestId);
                    lastRequestId = requestId;
                }
            }
            if (!opts?.silent) {
                const msg = isJudicialDecisionTemplate(reqTypeTemplate)
                    ? '✓ تم توثيق القرار في السجل.'
                    : '✓ تم تسجيل الطلب.';
                showLegalToast(msg, 5000);
            }
            return lastRequestId;
        }

        const singleDetentionPartyId =
            reqNeedsDetentionDateRange && detentionTargetIds.length >= 1
                ? detentionTargetIds.length === 1 || reqDetentionUnified
                    ? detentionTargetIds[0]
                    : undefined
                : undefined;
        const singleDetention = singleDetentionPartyId
            ? resolveDetentionDates(singleDetentionPartyId)
            : {
                  start: reqDetentionStartDate.trim() || undefined,
                  end: reqDetentionEndDate.trim() || undefined,
              };

        const { error, requestId } = createLawyerRequest(id, {
            ...basePayload,
            defendantIds: defendantIdsForPayload,
            detentionStartDate: singleDetention.start,
            detentionEndDate: singleDetention.end,
        });
        if (error) {
            showLegalToast(error, 5000);
            return null;
        }
        if (requestId) syncRequestUxAfterCreate(requestId);
        if (!opts?.silent) {
            const msg = isJudicialDecisionTemplate(reqTypeTemplate)
                ? '✓ تم توثيق القرار في السجل.'
                : '✓ تم تسجيل الطلب.';
            showLegalToast(msg, 5000);
        }
        return requestId;
    };

    const commitFinalizeRequest = (
        status: 'approved' | 'rejected',
        requestId: string,
        fields?: { judgeMargin: string; decisionDate: string },
    ) => {
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
            const expirationDetails =
                expirationReasonSnapshot === 'custom_manual'
                    ? expirationCustomSnapshot.trim() ||
                      reqNote.trim() ||
                      'انقضاء / سقوط الدعوى الجزائية'
                    : reqNote.trim() || 'انقضاء / سقوط الدعوى الجزائية';
            const conclusion: StageConclusion = {
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
    };

    const promptFatalRequestLock = (
        status: 'approved' | 'rejected',
        onConfirm: () => void,
    ) => {
        setConfirmAction({
            title: 'تأكيد الحفظ النهائي',
            message: buildRequestFatalLockMessage(status),
            confirmText: 'تأكيد الحفظ',
            cancelText: 'إلغاء',
            onConfirm,
        });
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
