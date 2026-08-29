import { useCallback, useEffect, useMemo } from 'react';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';
import { resolveCriminalDashboardNestedNav } from './resolveCriminalDashboardNestedNav';
import { tryCloseCriminalDashboardOverlayLayer } from './tryCloseCriminalDashboardOverlayLayer';
import type { UseCriminalDashboardNavigationGuardParams } from './useCriminalDashboardNavigationGuard.types';

export type {
    ConfirmActionState,
    IdentityEditState,
    UseCriminalDashboardNavigationGuardParams,
} from './useCriminalDashboardNavigationGuard.types';

/**
 * حارس الرجوع/Escape للوحة الجنائية — orchestrator منفصل.
 * يحدّد `handleDashboardBack` أعلى طبقة مفتوحة (مودال/فلتر/تبويب) بالترتيب
 * ويغلقها تدريجياً، ثم يسجّل مستمع Escape على النافذة ليستدعي نفس المنطق،
 * فيبقى اكتشاف الطبقة المفتوحة وإغلاقها في مكان واحد فقط.
 *
 * طبقات محلية: تُسجَّل في `criminalLocalOverlayBackStack` عبر
 * `useProceduralCanvasOverlayEscape` / `useCriminalLocalOverlayEscape`
 * (Escape capture + native-back + زر هيدر عبر tryPop أولاً).
 */
export function useCriminalDashboardNavigationGuard(params: UseCriminalDashboardNavigationGuardParams) {
    const {
        activeTab,
        switchDashboardTab,
        onClose,
        confirmAction,
        setConfirmAction,
        cassationResultContext,
        setCassationResultContext,
        cassationAppealModal,
        setCassationAppealModal,
        quickFinalizeRequest,
        closeQuickFinalizeModal,
        requestMarginModalOpen,
        setRequestMarginModalOpen,
        isRequestsModalOpen,
        closeRequestsModal,
        linkedTimelineFromProcedural,
        setLinkedTimelineFromProcedural,
        isStatementModalOpen,
        setIsStatementModalOpen,
        setEditingStatement,
        isTrialDepositionModalOpen,
        setIsTrialDepositionModalOpen,
        setEditingTrialDeposition,
        isOtherEvidenceFormOpen,
        setIsOtherEvidenceFormOpen,
        isTrashModalOpen,
        setIsTrashModalOpen,
        isReopenCaseOpen,
        setIsReopenCaseOpen,
        isSendToCassationOpen,
        setIsSendToCassationOpen,
        isMergeCasesOpen,
        setIsMergeCasesOpen,
        isStageCloserOpen,
        setIsStageCloserOpen,
        isLegalEditOpen,
        setIsLegalEditOpen,
        isInvestigationDecisionOpen,
        setIsInvestigationDecisionOpen,
        isSeveranceOpen,
        setIsSeveranceOpen,
        isInlineSeveranceFormOpen,
        setIsInlineSeveranceFormOpen,
        identityEdit,
        setIdentityEdit,
        forfeitureModal,
        setForfeitureModal,
        selectedPartyFilterId,
        setSelectedPartyFilterId,
        selectedJourneyBranchId,
        setSelectedJourneyBranchId,
        selectedNodeFilter,
        setSelectedNodeFilter,
        proceduralNavTarget,
        setProceduralNavTarget,
        isStageFinalDecisionOpen,
        setIsStageFinalDecisionOpen,
        verdictCassationFilingCard,
        setVerdictCassationFilingCard,
        trialSessionAddModalOpen,
        setTrialSessionAddModalOpen,
    } = params;

    /** رجوع تدريجي: طبقات محلية أولاً ثم المودالات ثم التبويب ثم الخروج. */
    const handleDashboardBack = useCallback(() => {
        if (
            tryCloseCriminalDashboardOverlayLayer({
                activeTab,
                switchDashboardTab,
                onClose,
                confirmAction,
                setConfirmAction,
                cassationResultContext,
                setCassationResultContext,
                cassationAppealModal,
                setCassationAppealModal,
                quickFinalizeRequest,
                closeQuickFinalizeModal,
                requestMarginModalOpen,
                setRequestMarginModalOpen,
                isRequestsModalOpen,
                closeRequestsModal,
                linkedTimelineFromProcedural,
                setLinkedTimelineFromProcedural,
                isStatementModalOpen,
                setIsStatementModalOpen,
                setEditingStatement,
                isTrialDepositionModalOpen,
                setIsTrialDepositionModalOpen,
                setEditingTrialDeposition,
                isOtherEvidenceFormOpen,
                setIsOtherEvidenceFormOpen,
                isTrashModalOpen,
                setIsTrashModalOpen,
                isReopenCaseOpen,
                setIsReopenCaseOpen,
                isSendToCassationOpen,
                setIsSendToCassationOpen,
                isMergeCasesOpen,
                setIsMergeCasesOpen,
                isStageCloserOpen,
                setIsStageCloserOpen,
                isLegalEditOpen,
                setIsLegalEditOpen,
                isInvestigationDecisionOpen,
                setIsInvestigationDecisionOpen,
                isSeveranceOpen,
                setIsSeveranceOpen,
                isInlineSeveranceFormOpen,
                setIsInlineSeveranceFormOpen,
                identityEdit,
                setIdentityEdit,
                forfeitureModal,
                setForfeitureModal,
                selectedPartyFilterId,
                setSelectedPartyFilterId,
                selectedJourneyBranchId,
                setSelectedJourneyBranchId,
                selectedNodeFilter,
                setSelectedNodeFilter,
                proceduralNavTarget,
                setProceduralNavTarget,
                isStageFinalDecisionOpen,
                setIsStageFinalDecisionOpen,
                verdictCassationFilingCard,
                setVerdictCassationFilingCard,
                trialSessionAddModalOpen,
                setTrialSessionAddModalOpen,
            })
        ) {
            return;
        }
        if (activeTab !== 'requests') {
            switchDashboardTab('requests');
            return;
        }
        onClose?.();
    }, [
        activeTab,
        cassationAppealModal,
        cassationResultContext,
        confirmAction,
        forfeitureModal,
        identityEdit,
        isInlineSeveranceFormOpen,
        isInvestigationDecisionOpen,
        isLegalEditOpen,
        isMergeCasesOpen,
        isOtherEvidenceFormOpen,
        isReopenCaseOpen,
        isRequestsModalOpen,
        isSendToCassationOpen,
        isSeveranceOpen,
        isStageCloserOpen,
        isStageFinalDecisionOpen,
        isStatementModalOpen,
        isTrashModalOpen,
        isTrialDepositionModalOpen,
        trialSessionAddModalOpen,
        verdictCassationFilingCard,
        linkedTimelineFromProcedural,
        onClose,
        proceduralNavTarget,
        quickFinalizeRequest,
        requestMarginModalOpen,
        selectedJourneyBranchId,
        selectedNodeFilter,
        selectedPartyFilterId,
        switchDashboardTab,
        closeQuickFinalizeModal,
        setCassationAppealModal,
        setCassationResultContext,
        setConfirmAction,
        setEditingStatement,
        setEditingTrialDeposition,
        setForfeitureModal,
        setIdentityEdit,
        setIsInlineSeveranceFormOpen,
        setIsInvestigationDecisionOpen,
        setIsLegalEditOpen,
        setIsMergeCasesOpen,
        setIsOtherEvidenceFormOpen,
        setIsReopenCaseOpen,
        setIsSendToCassationOpen,
        setIsSeveranceOpen,
        setIsStageCloserOpen,
        setIsStageFinalDecisionOpen,
        setIsStatementModalOpen,
        setIsTrashModalOpen,
        setIsTrialDepositionModalOpen,
        setTrialSessionAddModalOpen,
        setLinkedTimelineFromProcedural,
        setProceduralNavTarget,
        setRequestMarginModalOpen,
        setSelectedJourneyBranchId,
        setSelectedNodeFilter,
        setSelectedPartyFilterId,
        closeRequestsModal,
        setVerdictCassationFilingCard,
    ]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            if (event.defaultPrevented) return;
            event.preventDefault();
            event.stopPropagation();
            handleDashboardBack();
        };
        // Bubble (لا capture): طبقات canvas/hearing المحلية تسجّل capture + stopImmediatePropagation
        // فتغلق أولاً دون أن يخرج الحارس من الإضبارة. Native back يبقى LIFO عبر المكدس.
        window.addEventListener('keydown', onKeyDown);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            handleDashboardBack();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            unregisterNativeBack();
        };
    }, [handleDashboardBack]);

    const dossierNestedNav = useMemo(
        () =>
            resolveCriminalDashboardNestedNav({
                confirmAction,
                cassationResultContext,
                cassationAppealModal,
                isStageFinalDecisionOpen,
                verdictCassationFilingCard,
                trialSessionAddModalOpen,
                quickFinalizeRequest,
                requestMarginModalOpen,
                isRequestsModalOpen,
                linkedTimelineFromProcedural,
                isStatementModalOpen,
                isTrialDepositionModalOpen,
                isOtherEvidenceFormOpen,
                isTrashModalOpen,
                isReopenCaseOpen,
                isSendToCassationOpen,
                isMergeCasesOpen,
                isStageCloserOpen,
                isLegalEditOpen,
                isInvestigationDecisionOpen,
                isSeveranceOpen,
                isInlineSeveranceFormOpen,
                identityEdit,
                forfeitureModal,
                selectedPartyFilterId,
                selectedJourneyBranchId,
                selectedNodeFilter,
                proceduralNavTarget,
                activeTab,
            }),
        [
            activeTab,
            cassationAppealModal,
            cassationResultContext,
            confirmAction,
            forfeitureModal,
            identityEdit,
            isInlineSeveranceFormOpen,
            isInvestigationDecisionOpen,
            isLegalEditOpen,
            isMergeCasesOpen,
            isOtherEvidenceFormOpen,
            isReopenCaseOpen,
            isRequestsModalOpen,
            isSendToCassationOpen,
            isSeveranceOpen,
            isStageCloserOpen,
            isStageFinalDecisionOpen,
            isStatementModalOpen,
            isTrashModalOpen,
            isTrialDepositionModalOpen,
            linkedTimelineFromProcedural,
            proceduralNavTarget,
            quickFinalizeRequest,
            requestMarginModalOpen,
            selectedJourneyBranchId,
            selectedNodeFilter,
            selectedPartyFilterId,
            trialSessionAddModalOpen,
            verdictCassationFilingCard,
        ],
    );

    return { handleDashboardBack, dossierNestedNav };
}
