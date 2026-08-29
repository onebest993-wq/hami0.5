import React from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { PropertyInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/propertySeizureInlinePersistence';
import type { MovableInlineSaveContext } from '@/app/components/lawyer/ExecutionDashboard/utils/movableSeizureInlinePersistence';
import type { SaveSeizedMovableInitInput } from '@/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/executionDashboardFollowupSeizureInits';
import { ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals } from './ExecutionDashboardPhoneBodyTertiarySeizureSubjectModals';
import { ExecutionDashboardPhoneBodyTertiaryHubs } from './ExecutionDashboardPhoneBodyTertiaryHubs';
import type { ExecutionDashboardPhoneBodyDeferredScope } from './ExecutionDashboardPhoneBodyDeferredScope';
import type { SeizedMovable } from '@/app/types/execution';

export type ExecutionDashboardPhoneBodyTertiaryPanelsProps = {
    scope: ExecutionDashboardPhoneBodyDeferredScope;
    tertiaryStageReady: boolean;
    propertyInlineSaveCtx: PropertyInlineSaveContext;
    movableInlineSaveCtx: MovableInlineSaveContext;
    saveSeizedMovableInitForDecision: (input: SaveSeizedMovableInitInput) => SeizedMovable | null | void;
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
    propertyInlineSaveCtx,
    movableInlineSaveCtx,
    saveSeizedMovableInitForDecision,
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
                propertyInlineSaveCtx={propertyInlineSaveCtx}
                movableInlineSaveCtx={movableInlineSaveCtx}
                saveSeizedMovableInitForDecision={saveSeizedMovableInitForDecision}
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
