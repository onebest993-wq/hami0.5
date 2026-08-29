import { useFollowupModal } from '../followupModalContext';
import { useExecutionFollowupModalLiveHandlers } from './useExecutionFollowupModalLiveHandlers';
import { useExecutionFollowupModalPortalDerived } from './useExecutionFollowupModalPortalDerived';
import { useExecutionFollowupModalTabNavigation } from './useExecutionFollowupModalTabNavigation';
import type { ExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/executionDashboardCoreRuntimeVarsTypes';

type FollowupModalPortalLive = ExecutionDashboardCoreRuntimeVars &
    ReturnType<typeof useExecutionFollowupModalPortalDerived> &
    ReturnType<typeof useExecutionFollowupModalTabNavigation>;

export type ExecutionFollowupModalPortalController = FollowupModalPortalLive;

export function useExecutionFollowupModalPortalController(): FollowupModalPortalLive {
    const followup = useFollowupModal();
    const { handleSpecialFollowupSubmit, safeHandleDossierAction } =
        useExecutionFollowupModalLiveHandlers({
            handleDossierAction: followup.handleDossierAction as ((payload: unknown) => unknown) | undefined,
            submitSpecialFollowupRequest: followup.submitSpecialFollowupRequest as (() => unknown) | undefined,
            isRepresentingDebtor: Boolean(followup.isRepresentingDebtor),
            showToast:
                typeof followup.showToast === 'function'
                    ? (followup.showToast as (message: string, type?: string) => void)
                    : () => undefined,
            setDossierActionModalSaving:
                typeof followup.setDossierActionModalSaving === 'function'
                    ? (followup.setDossierActionModalSaving as (saving: boolean) => void)
                    : () => undefined,
        });

    const derived = useExecutionFollowupModalPortalDerived({
        PersonalTab: followup.PersonalTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['PersonalTab'],
        CoerciveTab: followup.CoerciveTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['CoerciveTab'],
        SeizureRequestsTab: followup.SeizureRequestsTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['SeizureRequestsTab'],
        FinancialTab: followup.FinancialTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['FinancialTab'],
        OtherPartyTab: followup.OtherPartyTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['OtherPartyTab'],
        CommunicationsTab: followup.CommunicationsTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['CommunicationsTab'],
        DossierControlsTab: followup.DossierControlsTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['DossierControlsTab'],
        RequestsTab: followup.RequestsTab as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['RequestsTab'],
        DebtorFinancialProgressBar: followup.DebtorFinancialProgressBar as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['DebtorFinancialProgressBar'],
        followupSpecialization: followup.followupSpecialization,
        claimType: followup.claimType,
        claimTypeForExecutionModule: followup.claimTypeForExecutionModule,
        assignmentWorkspaceCtx: followup.assignmentWorkspaceCtx as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['assignmentWorkspaceCtx'],
        closeFollowupModalPersisted: followup.closeFollowupModalPersisted as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['closeFollowupModalPersisted'],
        persistFollowupModalViewport: followup.persistFollowupModalViewport as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['persistFollowupModalViewport'],
        setShowUnifiedExecutionModal: followup.setShowUnifiedExecutionModal as Parameters<
            typeof useExecutionFollowupModalPortalDerived
        >[0]['setShowUnifiedExecutionModal'],
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
    } as FollowupModalPortalLive;
}
