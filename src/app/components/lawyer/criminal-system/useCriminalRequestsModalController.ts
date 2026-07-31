import type { Dispatch, SetStateAction } from 'react';
import { useCriminalStore, type CriminalComplainant, type CriminalDefendant, type LawyerRequest, type OurRepresentation } from './criminalStore';
import type { CriminalActionParty } from './criminalStagePresentationCore';
import type { InvestigationDefendantsPartyMix } from './juvenileInvestigationRules';
import { isLawyerRequestFinalStatus } from './lawyerRequestStatusMachine';
import type { CriminalRequestsOrchestratorSlice } from './orchestrators/criminalOrchestratorSliceTypes';
import type { DecisionsLedgerKindFilter } from './judicialDecisionsLedgerEngine';
import type { ConfirmActionState } from './CriminalDashboardModalsHost';
import { useCriminalRequestPartyScope } from './useCriminalRequestPartyScope';
import { useCriminalRequestTemplateHandlers } from './useCriminalRequestTemplateHandlers';
import { useCriminalRequestSpecialtyFields } from './useCriminalRequestSpecialtyFields';
import { useCriminalRequestFormFlags } from './useCriminalRequestFormFlags';
import { useCriminalRequestModalOpeners } from './useCriminalRequestModalOpeners';
import { useCriminalRequestCommitFlow } from './useCriminalRequestCommitFlow';
import type { CreateLawyerRequestInput } from './lawyerRequestsEngine';

export type CriminalRequestsModalControllerParams = {
    id: string;
    lawyerRequests: LawyerRequest[];
    defendants: CriminalDefendant[];
    complainants: CriminalComplainant[];
    activeParties: CriminalActionParty[];
    partyScopeDefendants: CriminalDefendant[];
    ourRepresentation: OurRepresentation;
    isDefense: boolean;
    isInvestigationPhase: boolean;
    investigationDefendantsPartyMix: InvestigationDefendantsPartyMix;
    isAllDefendantsUnknown: boolean;
    unknownDefendantsForPartyDisplay: CriminalDefendant[];
    isMutualComplaint: boolean;
    activeLegalArticle: string;
    autoConcernedPartyId: string | null;
    isEffectiveTrialCourtStage: boolean;
    isInvestigationDossierSealed: boolean;
    requestsOrchestrator: CriminalRequestsOrchestratorSlice;
    setConfirmAction: Dispatch<SetStateAction<ConfirmActionState | null>>;
    setDecisionsKindFilter: Dispatch<SetStateAction<DecisionsLedgerKindFilter>>;
    showLegalToast: (message: string, durationMs?: number) => void;
    /** إغلاق سريع للطلب — orchestrator منفصل (useCriminalRequestQuickFinalizeController) */
    closeQuickFinalizeModal: () => void;
    openRequestQuickFinalizeModalController: (
        request: LawyerRequest,
        onOpenLockedRequest: (request: LawyerRequest) => void,
    ) => void;
    submitQuickFinalizeController: (
        onPromptFatalLock: (status: 'approved' | 'rejected', onConfirm: () => void) => void,
        onCommitFinalize: (
            status: 'approved' | 'rejected',
            requestId: string,
            fields: { judgeMargin: string; decisionDate: string },
        ) => void,
    ) => void;
};

/**
 * تحكّم مودال «الطلبات» (قضائية + محامي) — مُركِّب (composer) يجمع ست
 * وحدات فرعية مشتقّة + مُعالِجات + مزامنات، ويُصدِّر نفس مفاتيح الناتج
 * التي كانت مبعثرة سابقاً في هذا الهوك الواحد:
 *
 * - {@link useCriminalRequestPartyScope}: مشتقّات الأطراف/النطاق (اختيار تلقائي، صور العرض).
 * - {@link useCriminalRequestTemplateHandlers}: تطبيق/تصفير القوالب + تحميل طلب محفوظ.
 * - {@link useCriminalRequestSpecialtyFields}: حقول الكفالة/التوقيف/حجز الأموال.
 * - {@link useCriminalRequestFormFlags}: أعلام وصلاحية النموذج (أساسية/نهائية).
 * - {@link useCriminalRequestModalOpeners}: فتح/إغلاق مسارات المودال المختلفة.
 * - {@link useCriminalRequestCommitFlow}: بناء الحمولة + إنشاء/إغلاق الطلب + التقديم.
 *
 * يُستهلَك من `CriminalDashboardResolvedRuntime` ويُمرَّر ناتجه إلى
 * `CriminalDashboardModalsHost` / `LazyCriminalDashboardRequestsTab` دون أي تغيير سلوكي.
 *
 * الحالة الخام (`req*`) تبقى في `useCriminalRequestsOrchestrator` ويُمرَّر الناتج
 * كاملاً هنا عبر `requestsOrchestrator` (يُبسَّط تمريره للوحدات الفرعية بالنشر
 * `...requestsOrchestrator` عند الحاجة) — هذا الهوك يضيف فقط طبقة المنطق
 * المشتق والمُعالِجات التي كانت مبعثرة داخل الـ runtime.
 */
export function useCriminalRequestsModalController(params: CriminalRequestsModalControllerParams) {
    const {
        id,
        lawyerRequests,
        defendants,
        complainants,
        activeParties,
        partyScopeDefendants,
        ourRepresentation,
        isDefense,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        isAllDefendantsUnknown,
        unknownDefendantsForPartyDisplay,
        isMutualComplaint,
        activeLegalArticle,
        autoConcernedPartyId,
        isEffectiveTrialCourtStage,
        isInvestigationDossierSealed,
        requestsOrchestrator: ro,
        setConfirmAction,
        setDecisionsKindFilter,
        showLegalToast,
        closeQuickFinalizeModal,
        openRequestQuickFinalizeModalController,
        submitQuickFinalizeController,
    } = params;

    const createLawyerRequest = useCriminalStore((s) => s.createLawyerRequest);
    const finalizeLawyerRequest = useCriminalStore((s) => s.finalizeLawyerRequest);
    const issueStageDecision = useCriminalStore((s) => s.issueStageDecision);
    const toggleRequestStar = useCriminalStore((s) => s.toggleRequestStar);
    const addRequestAttachment = useCriminalStore((s) => s.addRequestAttachment);

    const isRequestModalViewOnly = ro.requestModalMode === 'view';
    const isRequestCreateMode = ro.requestModalMode === 'create';
    const isRequestFinalStatus = isLawyerRequestFinalStatus(ro.reqStatus);

    const templateHandlers = useCriminalRequestTemplateHandlers({
        ...ro,
        activeLegalArticle,
        defendants,
        activeParties,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        lawyerRequests,
    });

    const partyScope = useCriminalRequestPartyScope({
        ...ro,
        isRequestModalViewOnly,
        defendants,
        complainants,
        activeParties,
        partyScopeDefendants,
        ourRepresentation,
        isDefense,
        isInvestigationPhase,
        investigationDefendantsPartyMix,
        isAllDefendantsUnknown,
        unknownDefendantsForPartyDisplay,
    });

    const specialtyFields = useCriminalRequestSpecialtyFields({
        ...ro,
        isRequestModalViewOnly,
        defendants,
        complainants,
        isMutualComplaint,
        ourRepresentation,
        autoRequestPartyId: partyScope.autoRequestPartyId,
        requestEligibleParties: partyScope.requestEligibleParties,
        requestDecisionsScope: partyScope.requestDecisionsScope,
        requestPartyCtx: partyScope.requestPartyCtx,
        defendantTargetRequestParties: partyScope.defendantTargetRequestParties,
        effectiveRequestPartyIds: partyScope.effectiveRequestPartyIds,
        showRequestPartyPicker: partyScope.showRequestPartyPicker,
        forceJudicialConcernedPartyPicker: partyScope.forceJudicialConcernedPartyPicker,
        showConcernedPartyCardsUi: partyScope.showConcernedPartyCardsUi,
        showUnknownPartyNoticeInRequestModal: partyScope.showUnknownPartyNoticeInRequestModal,
    });

    const formFlags = useCriminalRequestFormFlags({
        ...ro,
        reqNeedsPurgeDefendantScope: partyScope.reqNeedsPurgeDefendantScope,
        defendants,
        reqIsAssetSeizureEntry: specialtyFields.reqIsAssetSeizureEntry,
        showRequestPartySection: partyScope.showRequestPartySection,
        effectiveRequestPartyIds: partyScope.effectiveRequestPartyIds,
        detentionRangeValid: specialtyFields.detentionRangeValid,
        bailFormValid: specialtyFields.bailFormValid,
        assetSeizureFormValid: specialtyFields.assetSeizureFormValid,
    });

    const openers = useCriminalRequestModalOpeners({
        ...ro,
        autoRequestPartyId: partyScope.autoRequestPartyId,
        autoConcernedPartyId,
        activeLegalArticle,
        isInvestigationDossierSealed,
        isEffectiveTrialCourtStage,
        showLegalToast,
        setDecisionsKindFilter,
        openRequestQuickFinalizeModalController,
        applyJudicialTemplate: templateHandlers.applyJudicialTemplate,
        applyLawyerTemplate: templateHandlers.applyLawyerTemplate,
        loadRequestIntoModal: templateHandlers.loadRequestIntoModal,
    });

    const commitFlow = useCriminalRequestCommitFlow({
        ...ro,
        id,
        showLegalToast,
        setConfirmAction,
        createLawyerRequest: (caseId, payload) =>
            createLawyerRequest(caseId, payload as CreateLawyerRequestInput),
        finalizeLawyerRequest,
        issueStageDecision,
        toggleRequestStar,
        addRequestAttachment,
        closeRequestsModal: openers.closeRequestsModal,
        closeQuickFinalizeModal,
        submitQuickFinalizeController,
        defendants,
        ourRepresentation,
        isInvestigationPhase,
        reqNeedsPurgeDefendantScope: partyScope.reqNeedsPurgeDefendantScope,
        autoRequestPartyId: partyScope.autoRequestPartyId,
        requestEligibleParties: partyScope.requestEligibleParties,
        requestPartyCtx: partyScope.requestPartyCtx,
        requestDecisionsScope: partyScope.requestDecisionsScope,
        effectiveRequestPartyIds: partyScope.effectiveRequestPartyIds,
        showRequestPartySection: partyScope.showRequestPartySection,
        reqIsAssetSeizureEntry: specialtyFields.reqIsAssetSeizureEntry,
        reqIsDefendantBailEntry: specialtyFields.reqIsDefendantBailEntry,
        bailTargetDefendantIds: specialtyFields.bailTargetDefendantIds,
        reqNeedsDetentionDateRange: specialtyFields.reqNeedsDetentionDateRange,
        detentionRangeValid: specialtyFields.detentionRangeValid,
        bailFormValid: specialtyFields.bailFormValid,
        reqIsJudicialDecisionEntry: formFlags.reqIsJudicialDecisionEntry,
        requestFormBaseValid: formFlags.requestFormBaseValid,
        requestFormFinalValid: formFlags.requestFormFinalValid,
        isRequestModalViewOnly,
        isRequestCreateMode,
        isRequestFinalStatus,
    });

    return {
        isRequestModalViewOnly,
        isRequestFinalStatus,
        reqDecisionBeforeRequest: formFlags.reqDecisionBeforeRequest,
        investigationJudicialEntryScope: partyScope.investigationJudicialEntryScope,
        defendantTargetRequestParties: partyScope.defendantTargetRequestParties,
        mixedInvestigationScopedDefendantNames: partyScope.mixedInvestigationScopedDefendantNames,
        requestEligibleParties: partyScope.requestEligibleParties,
        isCustomJudicialEntry: partyScope.isCustomJudicialEntry,
        requestDecisionsScope: partyScope.requestDecisionsScope,
        showJuvenileJudgeConcernedPartyPicker: partyScope.showJuvenileJudgeConcernedPartyPicker,
        reqNeedsPurgeDefendantScope: partyScope.reqNeedsPurgeDefendantScope,
        showPurgeDefendantPicker: partyScope.showPurgeDefendantPicker,
        autoRequestPartyId: partyScope.autoRequestPartyId,
        showUnknownPartyNoticeInRequestModal: partyScope.showUnknownPartyNoticeInRequestModal,
        autoRequestPartyLabel: partyScope.autoRequestPartyLabel,
        customJudicialConcernedPartyOptions: partyScope.customJudicialConcernedPartyOptions,
        customJudicialConcernedPartyId: partyScope.customJudicialConcernedPartyId,
        showRequestPartySection: partyScope.showRequestPartySection,
        effectiveRequestPartyIds: partyScope.effectiveRequestPartyIds,
        patchReqDetentionForParty: partyScope.patchReqDetentionForParty,
        patchReqBailForParty: partyScope.patchReqBailForParty,
        clearRequestEntryLane: templateHandlers.clearRequestEntryLane,
        modalLinkedRequest: templateHandlers.modalLinkedRequest,
        applyJudicialTemplate: templateHandlers.applyJudicialTemplate,
        applyLawyerTemplate: templateHandlers.applyLawyerTemplate,
        openPrefilledRequestModal: openers.openPrefilledRequestModal,
        openQuickBailFromDecision: openers.openQuickBailFromDecision,
        openJudicialDecisionModal: openers.openJudicialDecisionModal,
        openAdultJudicialDecisionModal: openers.openAdultJudicialDecisionModal,
        openJuvenileJudicialDecisionModal: openers.openJuvenileJudicialDecisionModal,
        openLawyerMotionModal: openers.openLawyerMotionModal,
        openRequestViewModal: openers.openRequestViewModal,
        openRequestQuickFinalizeModal: openers.openRequestQuickFinalizeModal,
        closeRequestsModal: openers.closeRequestsModal,
        syncRequestUxAfterCreate: commitFlow.syncRequestUxAfterCreate,
        reqNeedsDetentionDateRange: specialtyFields.reqNeedsDetentionDateRange,
        reqJuvenileDetentionLocked: specialtyFields.reqJuvenileDetentionLocked,
        showJuvenileArrestLegalHint: specialtyFields.showJuvenileArrestLegalHint,
        reqIsJudicialDecisionEntry: formFlags.reqIsJudicialDecisionEntry,
        reqIsLawyerMotionEntry: formFlags.reqIsLawyerMotionEntry,
        reqIsOrderEnforcementEntry: formFlags.reqIsOrderEnforcementEntry,
        reqIsComplaintReferralEntry: formFlags.reqIsComplaintReferralEntry,
        reqIsDefendantBailEntry: specialtyFields.reqIsDefendantBailEntry,
        reqIsAssetSeizureEntry: specialtyFields.reqIsAssetSeizureEntry,
        showPartyPickerFormUi: specialtyFields.showPartyPickerFormUi,
        bailTargetDefendantIds: specialtyFields.bailTargetDefendantIds,
        fugitiveDefendants: specialtyFields.fugitiveDefendants,
        handleReqBailUnifiedChange: specialtyFields.handleReqBailUnifiedChange,
        handleReqDetentionUnifiedChange: specialtyFields.handleReqDetentionUnifiedChange,
        onAssetSeizureDraftsChange: specialtyFields.onAssetSeizureDraftsChange,
        requestFormBaseValid: formFlags.requestFormBaseValid,
        requestFormFinalValid: formFlags.requestFormFinalValid,
        submitRequest: commitFlow.submitRequest,
        submitQuickFinalize: commitFlow.submitQuickFinalize,
    };
}
