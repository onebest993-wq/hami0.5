import { DebtorFinancialProgressBar } from '../components/DebtorFinancialProgressBar';
import {
    LazyCoerciveTab,
    LazyCommunicationsTab,
    LazyDossierControlsTab,
    LazyFinancialTab,
    LazyOtherPartyTab,
    LazyPersonalTab,
    LazyRequestsTab,
    LazySeizureRequestsTab,
} from '../executionDashboardLazyRegistry';
import type { FollowupModalSnapshot } from '../followupModalContext';

const EMPTY_FOLLOWUP_SPECIALIZATION: FollowupModalSnapshot = {
    hideFollowupCoerciveTab: false,
    hideCoerciveGraceNoticeBanner: false,
    hideCoerciveFinancialBanners: false,
    hideCoerciveSeizureSalaryAndProperty: false,
    hideEncroachmentEvictionProcedureItems: false,
    hideEvictionCustodianProcedure: false,
    hidePersonalJudgePresentation: false,
    hidePersonalForcedBringActivation: false,
    hideGuarantorSeizureSubTab: false,
    hideAllGuarantorPresence: false,
    showEncroachmentRemovalRequestCards: false,
    showSpecificDeliverySurveyorCard: false,
    showSpecificDeliveryConversionCard: false,
    showSpecificDeliveryBreakInventoryCard: false,
    showSpecificDeliveryFieldProcedures: false,
    showCorrespondencesSoftProcedures: false,
    showFinancialGuarantorRequestOnly: false,
    isFinancialDebtCollection: false,
};

/** يكمّل snapshot محضر المتابعة من chunk scope — أسماء portal + lazy tabs + حقول خارج القائمة المولَّدة */
export function enrichFollowupModalSnapshot(
    scope: Record<string, unknown>,
    picked: FollowupModalSnapshot,
): FollowupModalSnapshot {
    const s = scope as FollowupModalSnapshot;

    return {
        ...picked,
        CoerciveTab: s.CoerciveTab ?? s.LazyCoerciveTab ?? LazyCoerciveTab,
        PersonalTab: s.PersonalTab ?? s.LazyPersonalTab ?? LazyPersonalTab,
        SeizureRequestsTab: s.SeizureRequestsTab ?? s.LazySeizureRequestsTab ?? LazySeizureRequestsTab,
        FinancialTab: s.FinancialTab ?? s.LazyFinancialTab ?? LazyFinancialTab,
        DossierControlsTab: s.DossierControlsTab ?? s.LazyDossierControlsTab ?? LazyDossierControlsTab,
        OtherPartyTab: s.OtherPartyTab ?? s.LazyOtherPartyTab ?? LazyOtherPartyTab,
        RequestsTab: s.RequestsTab ?? s.LazyRequestsTab ?? LazyRequestsTab,
        CommunicationsTab: s.CommunicationsTab ?? s.LazyCommunicationsTab ?? LazyCommunicationsTab,
        DebtorFinancialProgressBar: s.DebtorFinancialProgressBar ?? DebtorFinancialProgressBar,
        allDebtorsUnified: picked.allDebtorsUnified ?? s.allDebtorsUnified ?? [],
        isSolidaryLiability: picked.isSolidaryLiability ?? s.isSolidaryLiability ?? false,
        assignmentWorkspaceCtx:
            picked.assignmentWorkspaceCtx ??
            picked.followupAssignmentWorkspaceCtx ??
            s.assignmentWorkspaceCtx ??
            { activeDebtorKey: '' },
        activeDebtorNoticeScope:
            picked.activeDebtorNoticeScope ??
            picked.modalActiveDebtorNoticeScope ??
            s.activeDebtorNoticeScope ??
            {},
        kasabTerminationEmphasis:
            picked.kasabTerminationEmphasis ??
            picked.modalKasabTerminationEmphasis ??
            s.kasabTerminationEmphasis ??
            false,
        showEmployeeAssignmentCoerciveBlock:
            picked.showEmployeeAssignmentCoerciveBlock ??
            picked.modalShowEmployeeAssignmentCoerciveBlock ??
            false,
        showPersonalCoerciveFollowupTab: (() => {
            const fromPicked =
                picked.showPersonalCoerciveFollowupTab ?? picked.modalShowPersonalCoerciveFollowupTab;
            if (fromPicked !== undefined) return Boolean(fromPicked);
            const earnerSpec = s.followupSpecialization as { hidePersonalCoerciveFollowupTab?: boolean } | undefined;
            if (earnerSpec && typeof earnerSpec.hidePersonalCoerciveFollowupTab === 'boolean') {
                return !earnerSpec.hidePersonalCoerciveFollowupTab;
            }
            return false;
        })(),
        resolvedEmployeeSummonsAssignment:
            picked.resolvedEmployeeSummonsAssignment ??
            picked.modalResolvedEmployeeSummonsAssignment ??
            s.resolvedEmployeeSummonsAssignment ??
            null,
        personalTabLockedForEmployee:
            picked.personalTabLockedForEmployee ?? picked.modalPersonalTabLockedForEmployee ?? false,
        followupSpecialization: {
            ...EMPTY_FOLLOWUP_SPECIALIZATION,
            ...(typeof picked.followupModalSpecializationEffective === 'object' &&
            picked.followupModalSpecializationEffective
                ? (picked.followupModalSpecializationEffective as FollowupModalSnapshot)
                : {}),
            ...(typeof s.followupSpecialization === 'object' && s.followupSpecialization
                ? (s.followupSpecialization as FollowupModalSnapshot)
                : {}),
            ...(typeof picked.followupSpecialization === 'object' && picked.followupSpecialization
                ? (picked.followupSpecialization as FollowupModalSnapshot)
                : {}),
        },
        executionDebtorTabIndex: picked.executionDebtorTabIndex ?? s.executionDebtorTabIndex ?? 0,
        paidDebt: picked.paidDebt ?? s.paidDebt ?? 0,
        totalOwed: picked.totalOwed ?? s.totalOwed ?? 0,
        effectiveFollowupModalTabs:
            picked.effectiveFollowupModalTabs ??
            (Array.isArray(s.effectiveFollowupModalTabs) ? s.effectiveFollowupModalTabs : []),
    };
}
