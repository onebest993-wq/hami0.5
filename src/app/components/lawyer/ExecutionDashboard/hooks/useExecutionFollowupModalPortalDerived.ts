import { useCallback, useMemo, type ComponentType } from 'react';
import {
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDossierControlsTab,
    LazyFinancialTab,
    LazyOtherPartyTab,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
} from '../executionDashboardLazyRegistryShell';
import { isEncroachmentRemovalClaim } from '@/app/utils/executionModuleStrategies';
import { DebtorFinancialProgressBar as DebtorFinancialProgressBarComponent } from '../components/DebtorFinancialProgressBar';
import { useExecutionDashboardStore } from '@/app/stores';

export function useExecutionFollowupModalPortalDerived(params: {
    PersonalTab: ComponentType<Record<string, unknown>> | undefined;
    CoerciveTab: ComponentType<Record<string, unknown>> | undefined;
    SeizureRequestsTab: ComponentType<Record<string, unknown>> | undefined;
    FinancialTab: ComponentType<Record<string, unknown>> | undefined;
    OtherPartyTab: ComponentType<Record<string, unknown>> | undefined;
    CommunicationsTab: ComponentType<Record<string, unknown>> | undefined;
    DossierControlsTab: ComponentType<Record<string, unknown>> | undefined;
    RequestsTab: ComponentType<Record<string, unknown>> | undefined;
    DebtorFinancialProgressBar: ComponentType<Record<string, unknown>> | undefined;
    followupSpecialization: unknown;
    claimType: unknown;
    claimTypeForExecutionModule: unknown;
    assignmentWorkspaceCtx: { activeDebtorKey: string } | null | undefined;
    closeFollowupModalPersisted: (() => void) | undefined;
    persistFollowupModalViewport: (() => void) | undefined;
    setShowUnifiedExecutionModal: ((show: boolean) => void) | undefined;
    allDebtorsUnified: unknown;
    effectiveFollowupModalTabs: unknown;
}) {
    const {
        PersonalTab,
        CoerciveTab,
        SeizureRequestsTab,
        FinancialTab,
        OtherPartyTab,
        CommunicationsTab,
        DossierControlsTab,
        RequestsTab,
        DebtorFinancialProgressBar,
        followupSpecialization,
        claimType,
        claimTypeForExecutionModule,
        assignmentWorkspaceCtx,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        setShowUnifiedExecutionModal,
        allDebtorsUnified,
        effectiveFollowupModalTabs,
    } = params;

    const TabPersonal = PersonalTab ?? LazyPersonalTab;
    const TabCoercive = CoerciveTab ?? LazyCoerciveTab;
    const TabSeizureRequests = SeizureRequestsTab ?? LazySeizureRequestsTab;
    const TabFinancial = FinancialTab ?? LazyFinancialTab;
    const TabOtherParty = OtherPartyTab ?? LazyOtherPartyTab;
    const TabCommunications = CommunicationsTab ?? LazyCommunicationsTab;
    const TabDossierControls = DossierControlsTab ?? LazyDossierControlsTab;
    const TabRequests = RequestsTab ?? LazyRequestsTab;
    const ProgressBar = DebtorFinancialProgressBar ?? DebtorFinancialProgressBarComponent;

    const spec = useMemo(() => {
        const base = (followupSpecialization ?? {}) as Record<string, unknown>;
        const encroachmentClaimActive = isEncroachmentRemovalClaim(
            String(claimTypeForExecutionModule || claimType || ''),
        );
        if (!encroachmentClaimActive) return base;
        return {
            ...base,
            showEncroachmentRemovalRequestCards: true,
        };
    }, [claimType, claimTypeForExecutionModule, followupSpecialization]);

    const workspaceCtx = assignmentWorkspaceCtx ?? { activeDebtorKey: '' };

    const safeCloseFollowupModalPersisted = useCallback(() => {
        try {
            if (typeof closeFollowupModalPersisted === 'function') {
                closeFollowupModalPersisted();
            } else if (typeof persistFollowupModalViewport === 'function') {
                persistFollowupModalViewport();
            } else if (typeof setShowUnifiedExecutionModal === 'function') {
                setShowUnifiedExecutionModal(false);
            }
        } finally {
            // مصدر الحقيقة: أغلق الـ store دائماً حتى لو كان close من الـ snapshot stubاً صامتاً
            useExecutionDashboardStore.getState().closeModal('showUnifiedExecutionModal');
        }
    }, [closeFollowupModalPersisted, persistFollowupModalViewport, setShowUnifiedExecutionModal]);

    const debtorsUnified = Array.isArray(allDebtorsUnified) ? allDebtorsUnified : [];
    const followupModalTabs = Array.isArray(effectiveFollowupModalTabs)
        ? effectiveFollowupModalTabs
        : [];

    return {
        TabPersonal,
        TabCoercive,
        TabSeizureRequests,
        TabFinancial,
        TabOtherParty,
        TabCommunications,
        TabDossierControls,
        TabRequests,
        ProgressBar,
        spec,
        workspaceCtx,
        safeCloseFollowupModalPersisted,
        debtorsUnified,
        followupModalTabs,
    };
}
