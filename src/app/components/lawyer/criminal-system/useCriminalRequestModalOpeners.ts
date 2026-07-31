import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { LawyerRequest } from './criminalStore';
import type { DecisionsPartyScope } from './juvenileInvestigationRules';
import { BAIL_RELEASE_TEMPLATE, CUSTOM_JUDICIAL_DECISION_TYPE, CUSTOM_LAWYER_MOTION_TYPE, isJudicialDecisionTemplate } from './proceduralRequestTypes';
import type { DecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import type { JudicialDecision } from '@/app/types/criminal';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';
import { primeCriminalModalsHostMount } from './criminalModalsHostPrime';

type OpenersOrchestratorKeys =
    | 'setRequestModalLane' | 'setRequestModalMode' | 'setEditingRequestId' | 'setReqDate'
    | 'setReqType' | 'setReqTypeTemplate' | 'setReqEntryLane' | 'setReqCustomTypeName'
    | 'setReqIsAppealable' | 'setReqNote' | 'setReqStatus' | 'setReqJudgeMargin' | 'setReqDecisionDate'
    | 'setReqDefendantIds' | 'setReqDetentionStartDate' | 'setReqDetentionEndDate'
    | 'setReqDetentionByPartyId' | 'setReqLegalArticleBasis' | 'setReqReferredCourtName'
    | 'setReqBailByPartyId' | 'setReqBailUnified' | 'setReqDetentionUnified'
    | 'setReqSeizureSelectedDefendantIds' | 'setReqSeizureDraftsByDefendant' | 'setReqIsStarred'
    | 'setReqDraftAttachments' | 'setIsRequestsModalOpen' | 'setRequestMarginModalOpen';

export type CriminalRequestModalOpenersParams = Pick<CriminalRequestsOrchestratorSlice, OpenersOrchestratorKeys> & {
    autoRequestPartyId: string | null;
    autoConcernedPartyId: string | null;
    activeLegalArticle: string;
    isInvestigationDossierSealed: boolean;
    isEffectiveTrialCourtStage: boolean;
    showLegalToast: (message: string, durationMs?: number) => void;
    setDecisionsKindFilter: Dispatch<SetStateAction<DecisionsLedgerKindFilter>>;
    openRequestQuickFinalizeModalController: (
        request: LawyerRequest,
        onOpenLockedRequest: (request: LawyerRequest) => void,
    ) => void;
    applyJudicialTemplate: (v: string, groupScope?: DecisionsPartyScope | null) => void;
    applyLawyerTemplate: (v: string) => void;
    loadRequestIntoModal: (request: LawyerRequest) => void;
};

/**
 * فتح/إغلاق مودال الطلبات بمختلف مساراته (تعبئة مسبقة، قرار قضائي جديد،
 * طلب محامي، عرض/تحرير طلب محفوظ، إغلاق سريع) — كل مسار يُصفّر الحقول
 * المرتبطة بالمسار السابق قبل التعبئة.
 */
export function useCriminalRequestModalOpeners(params: CriminalRequestModalOpenersParams) {
    const {
        autoRequestPartyId,
        autoConcernedPartyId,
        activeLegalArticle,
        isInvestigationDossierSealed,
        isEffectiveTrialCourtStage,
        showLegalToast,
        setDecisionsKindFilter,
        openRequestQuickFinalizeModalController,
        applyJudicialTemplate,
        applyLawyerTemplate,
        loadRequestIntoModal,
        setRequestModalLane,
        setRequestModalMode,
        setEditingRequestId,
        setReqDate,
        setReqType,
        setReqTypeTemplate,
        setReqEntryLane,
        setReqCustomTypeName,
        setReqIsAppealable,
        setReqNote,
        setReqStatus,
        setReqJudgeMargin,
        setReqDecisionDate,
        setReqDefendantIds,
        setReqDetentionStartDate,
        setReqDetentionEndDate,
        setReqDetentionByPartyId,
        setReqLegalArticleBasis,
        setReqReferredCourtName,
        setReqBailByPartyId,
        setReqBailUnified,
        setReqDetentionUnified,
        setReqSeizureSelectedDefendantIds,
        setReqSeizureDraftsByDefendant,
        setReqIsStarred,
        setReqDraftAttachments,
        setIsRequestsModalOpen,
        setRequestMarginModalOpen,
    } = params;

    const openRequestsModalHost = useCallback(() => {
        primeCriminalModalsHostMount();
        setIsRequestsModalOpen(true);
    }, [setIsRequestsModalOpen]);

    const openPrefilledRequestModal = (
        template: string,
        defendantIds?: string[],
        opts?: { detentionStartDate?: string; detentionEndDate?: string },
    ) => {
        const isJudicial = isJudicialDecisionTemplate(template);
        setRequestModalLane(isJudicial ? 'judicial' : 'lawyer');
        setRequestModalMode('create');
        setEditingRequestId(null);
        setReqDate(new Date().toISOString().slice(0, 10));
        if (isJudicial) {
            applyJudicialTemplate(template);
        } else {
            applyLawyerTemplate(template);
        }
        setReqNote('');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDefendantIds(
            defendantIds?.length
                ? defendantIds
                : autoRequestPartyId
                  ? [autoRequestPartyId]
                  : autoConcernedPartyId
                    ? [autoConcernedPartyId]
                    : [],
        );
        setReqDetentionStartDate(String(opts?.detentionStartDate ?? '').trim());
        setReqDetentionEndDate(String(opts?.detentionEndDate ?? '').trim());
        setReqLegalArticleBasis(activeLegalArticle);
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        openRequestsModalHost();
    };

    const openQuickBailFromDecision = (decision: JudicialDecision) => {
        const ids = (decision.defendantIds ?? decision.beneficiaryPartyIds ?? []).filter(Boolean);
        openPrefilledRequestModal(BAIL_RELEASE_TEMPLATE, ids);
    };

    /**
     * فتح مودال «تقديم طلب إلى قرارات القاضي» — مع نطاق بالغ/حدث في مرحلة التحقيق.
     */
    const openJudicialDecisionModal = () => {
        if (isInvestigationDossierSealed) {
            showLegalToast('الإضبارة مختومة — لا يُسمح بتسجيل قرارات أو طلبات جديدة.', 5000);
            return;
        }
        setRequestModalLane('judicial');
        setRequestModalMode('create');
        setEditingRequestId(null);
        setReqDate(new Date().toISOString().slice(0, 10));
        const isCustomDefault = isEffectiveTrialCourtStage;
        if (isCustomDefault) {
            applyJudicialTemplate(CUSTOM_JUDICIAL_DECISION_TYPE);
        } else {
            setReqType('');
            setReqTypeTemplate('');
            setReqEntryLane('');
            setReqCustomTypeName('');
            setReqIsAppealable(false);
        }
        setReqNote('');
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDefendantIds(isCustomDefault ? [] : []);
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis(activeLegalArticle);
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        openRequestsModalHost();
    };

    const openAdultJudicialDecisionModal = () => {
        setDecisionsKindFilter('judicial');
        openJudicialDecisionModal();
    };

    const openJuvenileJudicialDecisionModal = () => {
        setDecisionsKindFilter('juvenile_judicial');
        openJudicialDecisionModal();
    };

    /**
     * فتح مودال «طلبات المحامي» — حاوية طلبات المحامي (البنفسجية) فقط، بدون قائمة منسدلة لاختيار النوع.
     * تُفعَّل تلقائياً حالة الإدخال اليدوي عبر `applyLawyerTemplate(CUSTOM_LAWYER_MOTION_TYPE)`.
     */
    const openLawyerMotionModal = () => {
        if (isInvestigationDossierSealed) {
            showLegalToast('الإضبارة مختومة — لا يُسمح بتسجيل طلبات جديدة.', 5000);
            return;
        }
        setRequestModalLane('lawyer');
        setRequestModalMode('create');
        setEditingRequestId(null);
        setReqDate(new Date().toISOString().slice(0, 10));
        applyLawyerTemplate(CUSTOM_LAWYER_MOTION_TYPE);
        setReqCustomTypeName('');
        setReqType('');
        setReqIsAppealable(false);
        setReqNote('');
        setReqStatus('pending');
        setReqJudgeMargin('');
        setReqDecisionDate('');
        setReqDefendantIds(autoRequestPartyId ? [autoRequestPartyId] : autoConcernedPartyId ? [autoConcernedPartyId] : []);
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqLegalArticleBasis(activeLegalArticle);
        setReqReferredCourtName('');
        setReqBailByPartyId({});
        setReqBailUnified(false);
        setReqDetentionUnified(false);
        setReqSeizureSelectedDefendantIds([]);
        setReqSeizureDraftsByDefendant({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        openRequestsModalHost();
    };

    const openRequestViewModal = (request: LawyerRequest) => {
        setRequestModalMode('view');
        setRequestModalLane(
            isJudicialDecisionTemplate(request.proceduralTemplate ?? request.type ?? '')
                ? 'judicial'
                : 'lawyer',
        );
        loadRequestIntoModal(request);
        openRequestsModalHost();
    };

    const openRequestQuickFinalizeModal = (request: LawyerRequest) => {
        openRequestQuickFinalizeModalController(request, openRequestViewModal);
    };

    const closeRequestsModal = useCallback(() => {
        setEditingRequestId(null);
        setRequestModalMode('create');
        setReqDetentionStartDate('');
        setReqDetentionEndDate('');
        setReqDetentionByPartyId({});
        setReqIsStarred(false);
        setReqDraftAttachments([]);
        setRequestMarginModalOpen(false);
        setIsRequestsModalOpen(false);
    }, [
        setEditingRequestId,
        setRequestModalMode,
        setReqDetentionStartDate,
        setReqDetentionEndDate,
        setReqDetentionByPartyId,
        setReqIsStarred,
        setReqDraftAttachments,
        setRequestMarginModalOpen,
        setIsRequestsModalOpen,
    ]);

    return {
        openPrefilledRequestModal,
        openQuickBailFromDecision,
        openJudicialDecisionModal,
        openAdultJudicialDecisionModal,
        openJuvenileJudicialDecisionModal,
        openLawyerMotionModal,
        openRequestViewModal,
        openRequestQuickFinalizeModal,
        closeRequestsModal,
    };
}
