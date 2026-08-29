import { useFollowupModal } from '../followupModalContext';
import { useExecutionFollowupModalLiveHandlers } from './useExecutionFollowupModalLiveHandlers';
import { useExecutionFollowupModalPortalDerived } from './useExecutionFollowupModalPortalDerived';
import { useExecutionFollowupModalTabNavigation } from './useExecutionFollowupModalTabNavigation';

export type ExecutionFollowupModalPortalController = ReturnType<
    typeof useExecutionFollowupModalPortalController
>;

export function useExecutionFollowupModalPortalController() {
    const followup = useFollowupModal();
    const { handleSpecialFollowupSubmit, safeHandleDossierAction } =
        useExecutionFollowupModalLiveHandlers({
            handleDossierAction: followup.handleDossierAction,
            submitSpecialFollowupRequest: followup.submitSpecialFollowupRequest,
            isRepresentingDebtor: followup.isRepresentingDebtor,
            showToast: followup.showToast,
            setDossierActionModalSaving: followup.setDossierActionModalSaving,
        });

    const derived = useExecutionFollowupModalPortalDerived({
        PersonalTab: followup.PersonalTab,
        CoerciveTab: followup.CoerciveTab,
        SeizureRequestsTab: followup.SeizureRequestsTab,
        FinancialTab: followup.FinancialTab,
        OtherPartyTab: followup.OtherPartyTab,
        CommunicationsTab: followup.CommunicationsTab,
        DossierControlsTab: followup.DossierControlsTab,
        RequestsTab: followup.RequestsTab,
        DebtorFinancialProgressBar: followup.DebtorFinancialProgressBar,
        followupSpecialization: followup.followupSpecialization,
        claimType: followup.claimType,
        claimTypeForExecutionModule: followup.claimTypeForExecutionModule,
        assignmentWorkspaceCtx: followup.assignmentWorkspaceCtx,
        closeFollowupModalPersisted: followup.closeFollowupModalPersisted,
        persistFollowupModalViewport: followup.persistFollowupModalViewport,
        setShowUnifiedExecutionModal: followup.setShowUnifiedExecutionModal,
        allDebtorsUnified: followup.allDebtorsUnified,
        effectiveFollowupModalTabs: followup.effectiveFollowupModalTabs,
    });

    const tabs = useExecutionFollowupModalTabNavigation({
        unifiedModalTab: followup.unifiedModalTab,
        setUnifiedModalTab: followup.setUnifiedModalTab,
        persistFollowupModalViewport: followup.persistFollowupModalViewport,
        queueMicrotask: followup.queueMicrotask,
        showPersonalCoerciveFollowupTab: followup.showPersonalCoerciveFollowupTab,
        hideFollowupCoerciveTab: derived.spec.hideFollowupCoerciveTab,
        followupModalTabs: derived.followupModalTabs,
        followupModalSectionTabsRef: followup.followupModalSectionTabsRef,
        openSeizureRequestsTab: followup.openSeizureRequestsTab,
    });

    return {
        ...followup,
        handleDossierAction: safeHandleDossierAction,
        handleSpecialFollowupSubmit,
        ...derived,
        ...tabs,
    };
}
