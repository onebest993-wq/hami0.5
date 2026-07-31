import { useCallback, useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { LawyerRequest, Statement, TimelineEvent } from './criminalStore';
import type { TrialDeposition } from './trialDepositionsEngine';
import type { ProceduralNavTarget } from './proceduralContainersEngine';
import type { CriminalDashboardTab } from './criminalDashboardTabChrome';
import type { JudicialDecision, JudicialDecisionAppeal } from '@/app/types/criminal';
import type { JudicialCassationAppealModalVariant } from './components/JudicialCassationAppealModal';
import { registerNativeBackHandler } from '@/app/runtime/capacitorAppLifecycle';

export type ConfirmActionState = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
} | null;

export type IdentityEditState =
    | null
    | {
          mode: 'party';
          kind: 'complainant' | 'defendant';
          id: string;
          fullName: string;
          phone?: string;
          address: string;
      }
    | { mode: 'venue' };

type CassationAppealModalState = {
    decision: JudicialDecision;
    variant: JudicialCassationAppealModalVariant;
} | null;

type CassationResultContextState = {
    decision: JudicialDecision;
    appeal: JudicialDecisionAppeal;
} | null;

type ForfeitureModalState = { defendantId: string; forfeitureNote: string } | null;

import type { VerdictCard } from './verdictCardsEngine';

export type UseCriminalDashboardNavigationGuardParams = {
    activeTab: CriminalDashboardTab;
    switchDashboardTab: (tab: CriminalDashboardTab) => void;
    onClose?: () => void;

    confirmAction: ConfirmActionState;
    setConfirmAction: Dispatch<SetStateAction<ConfirmActionState>>;

    cassationResultContext: CassationResultContextState;
    setCassationResultContext: Dispatch<SetStateAction<CassationResultContextState>>;
    cassationAppealModal: CassationAppealModalState;
    setCassationAppealModal: Dispatch<SetStateAction<CassationAppealModalState>>;

    quickFinalizeRequest: LawyerRequest | null;
    closeQuickFinalizeModal: () => void;

    requestMarginModalOpen: boolean;
    setRequestMarginModalOpen: Dispatch<SetStateAction<boolean>>;

    isRequestsModalOpen: boolean;
    closeRequestsModal: () => void;

    linkedTimelineFromProcedural: TimelineEvent | null;
    setLinkedTimelineFromProcedural: Dispatch<SetStateAction<TimelineEvent | null>>;

    isStatementModalOpen: boolean;
    setIsStatementModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditingStatement: Dispatch<SetStateAction<Statement | null>>;

    isTrialDepositionModalOpen: boolean;
    setIsTrialDepositionModalOpen: Dispatch<SetStateAction<boolean>>;
    setEditingTrialDeposition: Dispatch<SetStateAction<TrialDeposition | null>>;

    isOtherEvidenceFormOpen: boolean;
    setIsOtherEvidenceFormOpen: Dispatch<SetStateAction<boolean>>;

    isTrashModalOpen: boolean;
    setIsTrashModalOpen: Dispatch<SetStateAction<boolean>>;

    isReopenCaseOpen: boolean;
    setIsReopenCaseOpen: Dispatch<SetStateAction<boolean>>;

    isSendToCassationOpen: boolean;
    setIsSendToCassationOpen: Dispatch<SetStateAction<boolean>>;

    isMergeCasesOpen: boolean;
    setIsMergeCasesOpen: Dispatch<SetStateAction<boolean>>;

    isStageCloserOpen: boolean;
    setIsStageCloserOpen: Dispatch<SetStateAction<boolean>>;

    isLegalEditOpen: boolean;
    setIsLegalEditOpen: Dispatch<SetStateAction<boolean>>;

    isInvestigationDecisionOpen: boolean;
    setIsInvestigationDecisionOpen: Dispatch<SetStateAction<boolean>>;

    isSeveranceOpen: boolean;
    setIsSeveranceOpen: Dispatch<SetStateAction<boolean>>;

    isInlineSeveranceFormOpen: boolean;
    setIsInlineSeveranceFormOpen: Dispatch<SetStateAction<boolean>>;

    identityEdit: IdentityEditState;
    setIdentityEdit: Dispatch<SetStateAction<IdentityEditState>>;

    forfeitureModal: ForfeitureModalState;
    setForfeitureModal: Dispatch<SetStateAction<ForfeitureModalState>>;

    selectedPartyFilterId: string;
    setSelectedPartyFilterId: Dispatch<SetStateAction<string>>;

    selectedJourneyBranchId: string;
    setSelectedJourneyBranchId: Dispatch<SetStateAction<string>>;

    selectedNodeFilter: string;
    setSelectedNodeFilter: Dispatch<SetStateAction<string>>;

    proceduralNavTarget: ProceduralNavTarget | null;
    setProceduralNavTarget: Dispatch<SetStateAction<ProceduralNavTarget | null>>;

    isStageFinalDecisionOpen: boolean;
    setIsStageFinalDecisionOpen: Dispatch<SetStateAction<boolean>>;
    verdictCassationFilingCard: VerdictCard | null;
    setVerdictCassationFilingCard: Dispatch<SetStateAction<VerdictCard | null>>;
    trialSessionAddModalOpen: boolean;
    setTrialSessionAddModalOpen: Dispatch<SetStateAction<boolean>>;
};

/**
 * حارس الرجوع/Escape للوحة الجنائية — orchestrator منفصل.
 * يحدّد `handleDashboardBack` أعلى طبقة مفتوحة (مودال/فلتر/تبويب) بالترتيب
 * ويغلقها تدريجياً، ثم يسجّل مستمع Escape على النافذة ليستدعي نفس المنطق،
 * فيبقى اكتشاف الطبقة المفتوحة وإغلاقها في مكان واحد فقط.
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

    /** رجوع تدريجي: إغلاق الطبقات العلوية ثم التبويب ثم الخروج من الإضبارة. */
    const handleDashboardBack = useCallback(() => {
        if (confirmAction) {
            setConfirmAction(null);
            return;
        }
        if (cassationResultContext) {
            setCassationResultContext(null);
            return;
        }
        if (cassationAppealModal) {
            setCassationAppealModal(null);
            return;
        }
        if (isStageFinalDecisionOpen) {
            setIsStageFinalDecisionOpen(false);
            return;
        }
        if (verdictCassationFilingCard) {
            setVerdictCassationFilingCard(null);
            return;
        }
        if (trialSessionAddModalOpen) {
            setTrialSessionAddModalOpen(false);
            return;
        }
        if (quickFinalizeRequest) {
            closeQuickFinalizeModal();
            return;
        }
        if (requestMarginModalOpen) {
            setRequestMarginModalOpen(false);
            return;
        }
        if (isRequestsModalOpen) {
            closeRequestsModal();
            return;
        }
        if (linkedTimelineFromProcedural) {
            setLinkedTimelineFromProcedural(null);
            return;
        }
        if (isStatementModalOpen) {
            setIsStatementModalOpen(false);
            setEditingStatement(null);
            return;
        }
        if (isTrialDepositionModalOpen) {
            setIsTrialDepositionModalOpen(false);
            setEditingTrialDeposition(null);
            return;
        }
        if (isOtherEvidenceFormOpen) {
            setIsOtherEvidenceFormOpen(false);
            return;
        }
        if (isTrashModalOpen) {
            setIsTrashModalOpen(false);
            return;
        }
        if (isReopenCaseOpen) {
            setIsReopenCaseOpen(false);
            return;
        }
        if (isSendToCassationOpen) {
            setIsSendToCassationOpen(false);
            return;
        }
        if (isMergeCasesOpen) {
            setIsMergeCasesOpen(false);
            return;
        }
        if (isStageCloserOpen) {
            setIsStageCloserOpen(false);
            return;
        }
        if (isLegalEditOpen) {
            setIsLegalEditOpen(false);
            return;
        }
        if (isInvestigationDecisionOpen) {
            setIsInvestigationDecisionOpen(false);
            return;
        }
        if (isSeveranceOpen) {
            setIsSeveranceOpen(false);
            return;
        }
        if (isInlineSeveranceFormOpen) {
            setIsInlineSeveranceFormOpen(false);
            return;
        }
        if (identityEdit) {
            setIdentityEdit(null);
            return;
        }
        if (forfeitureModal) {
            setForfeitureModal(null);
            return;
        }
        if (selectedPartyFilterId) {
            setSelectedPartyFilterId('');
            return;
        }
        if (selectedJourneyBranchId) {
            setSelectedJourneyBranchId('');
            return;
        }
        if (selectedNodeFilter) {
            setSelectedNodeFilter('');
            return;
        }
        if (proceduralNavTarget) {
            setProceduralNavTarget(null);
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
    ]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            event.stopImmediatePropagation();
            handleDashboardBack();
        };
        window.addEventListener('keydown', onKeyDown, true);
        const unregisterNativeBack = registerNativeBackHandler(() => {
            handleDashboardBack();
            return true;
        });
        return () => {
            window.removeEventListener('keydown', onKeyDown, true);
            unregisterNativeBack();
        };
    }, [handleDashboardBack]);

    return { handleDashboardBack };
}
