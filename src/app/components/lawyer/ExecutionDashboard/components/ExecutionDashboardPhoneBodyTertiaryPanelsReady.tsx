import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals } from './ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals';
import { ExecutionDashboardPhoneBodyTertiaryHubs } from './ExecutionDashboardPhoneBodyTertiaryHubs';
import type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';

export type ExecutionDashboardPhoneBodyTertiaryPanelsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    tertiaryStageReady: boolean;
    closeFinancialHubPortal: () => void;
    toggleFinancialCenterExpanded: () => void;
    openGuarantorFollowupDetails: () => void;
    directOpenPaymentCalculator: () => void;
    directOpenSettlementCalculator: () => void;
    directOpenLedgerModal: () => void;
    directOpenEvictionExpenseModal: () => void;
    expandDebtor?: (debtorKey: string) => void;
    primaryDebtorWorkspaceKey?: string;
    setShowUnifiedExecutionModal?: Dispatch<SetStateAction<boolean>>;
    setExecutionDebtorTabIndex?: Dispatch<SetStateAction<number>>;
};

export function ExecutionDashboardPhoneBodyTertiaryPanelsReady({
    scope,
    tertiaryStageReady,
    closeFinancialHubPortal,
    toggleFinancialCenterExpanded,
    openGuarantorFollowupDetails,
    directOpenPaymentCalculator,
    directOpenSettlementCalculator,
    directOpenLedgerModal,
    directOpenEvictionExpenseModal,
    expandDebtor,
    primaryDebtorWorkspaceKey,
    setShowUnifiedExecutionModal,
    setExecutionDebtorTabIndex,
}: ExecutionDashboardPhoneBodyTertiaryPanelsProps) {
    const {
        propertySeizureRequestModalOpen,
        propertySeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        submitPropertySeizureRequest,
        movableSeizureRequestModalOpen,
        movableSeizureSubjectDraft,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
        submitMovableSeizureRequest,
    } = scope;

    if (!tertiaryStageReady) {
        return null;
    }

    return (
        <>
            <ExecutionDashboardPhoneBodyTertiaryHubs
                scope={scope}
                closeFinancialHubPortal={closeFinancialHubPortal}
                toggleFinancialCenterExpanded={toggleFinancialCenterExpanded}
                openGuarantorFollowupDetails={openGuarantorFollowupDetails}
                directOpenPaymentCalculator={directOpenPaymentCalculator}
                directOpenSettlementCalculator={directOpenSettlementCalculator}
                directOpenLedgerModal={directOpenLedgerModal}
                directOpenEvictionExpenseModal={directOpenEvictionExpenseModal}
                expandDebtor={expandDebtor}
                primaryDebtorWorkspaceKey={primaryDebtorWorkspaceKey}
                setShowUnifiedExecutionModal={setShowUnifiedExecutionModal}
                setExecutionDebtorTabIndex={setExecutionDebtorTabIndex}
            />

            <ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals
                propertySeizureRequestModalOpen={propertySeizureRequestModalOpen}
                propertySeizureSubjectDraft={propertySeizureSubjectDraft}
                setPropertySeizureRequestModalOpen={setPropertySeizureRequestModalOpen}
                setPropertySeizureSubjectDraft={setPropertySeizureSubjectDraft}
                submitPropertySeizureRequest={submitPropertySeizureRequest}
                movableSeizureRequestModalOpen={movableSeizureRequestModalOpen}
                movableSeizureSubjectDraft={movableSeizureSubjectDraft}
                setMovableSeizureRequestModalOpen={setMovableSeizureRequestModalOpen}
                setMovableSeizureSubjectDraft={setMovableSeizureSubjectDraft}
                submitMovableSeizureRequest={submitMovableSeizureRequest}
            />
        </>
    );
}
